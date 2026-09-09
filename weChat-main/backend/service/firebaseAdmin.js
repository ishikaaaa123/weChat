const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

function getFirebaseAdmin() {
  if (!getApps().length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      throw new Error("Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON in backend/.env.");
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new Error("Firebase Admin is not configured: FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON.");
    }

    initializeApp({ credential: cert(serviceAccount) });
  }

  // Preserve the existing getFirebaseAdmin().auth().verifyIdToken(...) usage.
  return { auth: () => getAuth() };
}

module.exports = { getFirebaseAdmin };
