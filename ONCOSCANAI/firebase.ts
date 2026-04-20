import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

/**
 * Set these in `.env.local` (same folder as this file). Restart `npm run dev` after changes.
 * Firebase console → Project settings → Your apps → Web app → Firebase SDK snippet (Config).
 *
 * If you see auth/api-key-not-valid:
 * - Confirm every value matches the console (no extra spaces or quotes).
 * - Google Cloud Console → APIs & Services → Credentials → your Browser API key:
 *   under "Application restrictions", either use "None" for dev, or add HTTP referrers:
 *   http://localhost:3002/* and http://127.0.0.1:3002/*
 * - Under "API restrictions", ensure Firebase-related APIs / Identity Toolkit are allowed.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  ...(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    ? { measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string }
    : {}),
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

if (typeof window !== 'undefined') {
  void isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  });
}

export default app;
