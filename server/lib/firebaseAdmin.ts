import admin from "firebase-admin";
import fs from "fs";
import path from "path";

function loadCredentials(): admin.ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")?.trim();

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  const jsonPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(process.cwd(), "server", "firebase-service-account.json");
  try {
    const raw = fs.readFileSync(jsonPath, "utf8");
    const json = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (json.project_id && json.client_email && json.private_key) {
      return {
        projectId: json.project_id,
        clientEmail: json.client_email,
        privateKey: json.private_key.replace(/\\n/g, "\n"),
      };
    }
  } catch {
    // File missing or invalid — use env only
  }
  return null;
}

const credentials = loadCredentials();

if (!admin.apps.length && credentials) {
  admin.initializeApp({
    credential: admin.credential.cert(credentials),
  });
}

export const firebaseAdmin = admin;
export const isFirebaseConfigured = !!credentials && admin.apps.length > 0;

