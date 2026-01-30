import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Web app config (riya-auth / riya-auth-5e0f6). Env vars VITE_FIREBASE_* override if set.
const firebaseConfig = {
  apiKey:
    (import.meta.env.VITE_FIREBASE_API_KEY as string) ||
    "AIzaSyBh0OhTJe2-m_ybCD4s4PmkjFgou8NH3yQ",
  authDomain:
    (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) ||
    "riya-auth-5e0f6.firebaseapp.com",
  projectId:
    (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || "riya-auth-5e0f6",
  storageBucket:
    (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) ||
    "riya-auth-5e0f6.firebasestorage.app",
  messagingSenderId:
    (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) ||
    "1041812266516",
  appId:
    (import.meta.env.VITE_FIREBASE_APP_ID as string) ||
    "1:1041812266516:web:977847db3741dc61661101",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

