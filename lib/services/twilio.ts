import twilio from "twilio";

// Credentials provided by user
// TODO: Move these to environment variables in production
const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || "";

class TwilioService {
    private client: twilio.Twilio;

    constructor() {
        this.client = twilio(accountSid, authToken);
        console.log("[Twilio] Service initialized");
    }

    async sendSMS(to: string, body: string) {
        try {
            const message = await this.client.messages.create({
                body,
                from: twilioNumber,
                to,
            });
            console.log(`[Twilio] SMS sent to ${to}: ${message.sid}`);
            return message;
        } catch (error) {
            console.error("[Twilio] Error sending SMS:", error);
            throw error;
        }
    }

    async sendWhatsApp(to: string, body: string) {
        try {
            // Twilio WhatsApp sandbox requires 'whatsapp:' prefix
            const from = `whatsapp:${twilioNumber}`;
            const toWhatsApp = `whatsapp:${to}`;

            const message = await this.client.messages.create({
                body,
                from,
                to: toWhatsApp,
            });
            console.log(`[Twilio] WhatsApp sent to ${to}: ${message.sid}`);
            return message;
        } catch (error) {
            console.error("[Twilio] Error sending WhatsApp:", error);
            throw error;
        }
    }
}

export const twilioService = new TwilioService();
