/**
 * Firebase initialization — client-side only.
 *
 * The Firebase Web config is NOT secret; access is controlled by the create-only
 * Firestore security rules (see `firestore.rules`), not by hiding the API key.
 * Values come from PUBLIC_ env vars so nothing is hardcoded (see `.env.example`).
 *
 * This module is intentionally the ONLY place that touches the Firebase SDK, and it
 * is only imported by `waitlist.ts`. If/when the project finishes migrating to
 * Supabase, swap the implementation inside `waitlist.ts` and this file can be deleted.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseEnv {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const PLACEHOLDER = '[PLACEHOLDER]';

function readEnv(): FirebaseEnv | null {
  const env = import.meta.env;
  const cfg: FirebaseEnv = {
    apiKey: env.PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: env.PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: env.PUBLIC_FIREBASE_APP_ID ?? '',
  };

  // Treat unset or still-placeholder config as "not configured".
  const values = Object.values(cfg);
  const configured =
    values.every((v) => v.length > 0) && !values.some((v) => v.includes(PLACEHOLDER));
  return configured ? cfg : null;
}

/** True when real Firebase credentials are present (so the UI can degrade gracefully). */
export function isFirebaseConfigured(): boolean {
  return readEnv() !== null;
}

let cachedDb: Firestore | null = null;

/**
 * Returns a Firestore instance, initializing the app once. Throws a clear,
 * actionable error if env vars are missing — callers should catch and surface a
 * friendly message rather than crash.
 */
export function getDb(): Firestore {
  if (cachedDb) return cachedDb;

  const cfg = readEnv();
  if (!cfg) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env and set PUBLIC_FIREBASE_* values.',
    );
  }

  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(cfg);
  cachedDb = getFirestore(app);
  return cachedDb;
}
