import "dotenv/config";
import { google } from "googleapis";
import nodemailer from "nodemailer";

import { Resend } from "resend";

let connectionSettings: any;
let smtpTransporter: nodemailer.Transporter | null = null;
let resendClient: Resend | null = null;

if (process.env.RESEND_API_KEY) {
  resendClient = new Resend(process.env.RESEND_API_KEY);
}

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
  secure:
    process.env.SMTP_SECURE?.toLowerCase() === "true" ||
    process.env.SMTP_PORT === "465",
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
};

function hasSmtpConfig() {
  return Boolean(smtpConfig.host && smtpConfig.user && smtpConfig.pass);
}

function hasReplitConnector() {
  return Boolean(
    process.env.REPLIT_CONNECTORS_HOSTNAME &&
    (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL),
  );
}

async function getSmtpTransporter() {
  if (!hasSmtpConfig()) {
    return null;
  }

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port || 587,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user!,
        pass: smtpConfig.pass!,
      },
    });
  }

  return smtpTransporter;
}

async function getAccessToken() {
  if (
    connectionSettings &&
    connectionSettings.settings.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    throw new Error("Replit connector tokens are not configured");
  }

  connectionSettings = await fetch(
    "https://" +
    hostname +
    "/api/v2/connection?include_secrets=true&connector_names=google-mail",
    {
      headers: {
        Accept: "application/json",
        "X_REPLIT_TOKEN": xReplitToken,
      },
    },
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error("Gmail not connected");
  }
  return accessToken;
}

async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function sendOTPEmail(to: string, otp: string, name?: string) {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const subject = "Your Login OTP - Riya";
  const htmlBody = `
    <div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fef7ff;">
      <div style="background: linear-gradient(135deg, #e0b3ff 0%, #ffc2d1 100%); padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: #4a1d5c; margin: 0; font-size: 28px;">Riya</h1>
      </div>
      
      <div style="background-color: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <p style="color: #4a1d5c; font-size: 16px; line-height: 1.6;">${greeting}</p>
        
        <p style="color: #6b4d7a; font-size: 16px; line-height: 1.6;">Your One-Time Password (OTP) for logging in to Riya is:</p>
        
        <div style="background-color: #fef7ff; border: 2px solid #e0b3ff; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
          <h2 style="color: #4a1d5c; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${otp}</h2>
        </div>
        
        <p style="color: #6b4d7a; font-size: 14px; line-height: 1.6;">This OTP is valid for <strong>24 hours</strong>.</p>
        
        <p style="color: #6b4d7a; font-size: 14px; line-height: 1.6;">If you didn't request this OTP, please ignore this email.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0b3ff;">
          <p style="color: #9b8aa3; font-size: 12px; text-align: center; margin: 0;">
            This is an automated message from Riya. Please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  const textBody = `${greeting}\n\nYour One-Time Password (OTP) for logging in to Riya is: ${otp}\n\nThis OTP is valid for 24 hours.\n\nIf you didn't request this OTP, please ignore this email.\n\n---\nThis is an automated message from Riya. Please do not reply to this email.`;

  if (await trySendWithResend({ to, subject, htmlBody })) {
    return;
  }

  if (await trySendWithSmtp({ to, subject, htmlBody, textBody })) {
    return;
  }

  if (await trySendWithReplitGmail({ to, subject, htmlBody })) {
    return;
  }

  const fallbackMessage = `[DEV] OTP email not sent. Provide RESEND_API_KEY, SMTP_* env vars or Replit connector secrets. OTP=${otp} to=${to}`;
  if (process.env.NODE_ENV === "production") {
    console.error(fallbackMessage);
    throw new Error("Email service not configured");
  }

  console.warn(fallbackMessage);
}

async function trySendWithResend({
  to,
  subject,
  htmlBody,
}: {
  to: string;
  subject: string;
  htmlBody: string;
}): Promise<boolean> {
  if (!resendClient) {
    return false;
  }

  try {
    // In testing mode, Resend only allows sending to verified email
    // So we send to the verified email but include the original recipient in the subject
    const testMode = process.env.NODE_ENV !== "production";
    const actualRecipient = testMode ? "teamnuvoro@gmail.com" : to;
    const testSubject = testMode ? `${subject} [Test for: ${to}]` : subject;

    const { data, error } = await resendClient.emails.send({
      from: "Riya <onboarding@resend.dev>",
      to: [actualRecipient],
      subject: testSubject,
      html: htmlBody,
    });

    if (error) {
      console.error("Resend API error:", error);
      return false;
    }

    console.log(`Email sent via Resend to ${actualRecipient}:`, data?.id);
    if (testMode && to !== actualRecipient) {
      console.log(`⚠️  TEST MODE: Email intended for ${to} was sent to ${actualRecipient}`);
    }
    return true;
  } catch (error) {
    console.error("Resend send error:", error);
    return false;
  }
}

async function trySendWithSmtp({
  to,
  subject,
  htmlBody,
  textBody,
}: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}): Promise<boolean> {
  try {
    const transporter = await getSmtpTransporter();
    if (!transporter) {
      return false;
    }

    await transporter.sendMail({
      from: smtpConfig.from,
      to,
      subject,
      html: htmlBody,
      text: textBody,
    });

    return true;
  } catch (error) {
    console.error("SMTP send error:", error);
    return false;
  }
}

async function trySendWithReplitGmail({
  to,
  subject,
  htmlBody,
}: {
  to: string;
  subject: string;
  htmlBody: string;
}): Promise<boolean> {
  if (!hasReplitConnector()) {
    return false;
  }

  try {
    const gmail = await getUncachableGmailClient();

    const message = [
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      `To: ${to}`,
      `Subject: ${subject}`,
      "",
      htmlBody,
    ].join("\n");

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    return true;
  } catch (error) {
    console.error("Replit Gmail send error:", error);
    return false;
  }
}
