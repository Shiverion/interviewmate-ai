import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function serviceAccount(): ServiceAccountJson | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccountJson;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key)
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function adminFirestoreConfigured() {
  return serviceAccount() !== null;
}

export function adminFirestore() {
  const account = serviceAccount();
  if (!account) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured.");
  }
  const privateKey = account.private_key;
  if (!privateKey) throw new Error("Firebase service account key is invalid.");
  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  return getFirestore(app);
}
