import { initializeApp, getApps } from 'firebase/app'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let recaptchaVerifier = null
let confirmationResult = null

export function getFirebaseAuth() {
  const missingValues = Object.entries(firebaseConfig).filter(([, value]) => !value).map(([key]) => key)
  if (missingValues.length) throw new Error(`Firebase is not configured. Add ${missingValues.join(', ')} to .env.local.`)
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  const auth = getAuth(app)

  // Firebase supports bypassing app verification only for fictional numbers in
  // local development. The DEV guard makes this impossible in a production build.
  if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_TEST_PHONE_AUTH === 'true') {
    auth.settings.appVerificationDisabledForTesting = true
  }

  return auth
}

// Requests an OTP from Firebase. With an approved test number, Firebase uses
// the test code configured in its console rather than sending an actual SMS.
export async function generatePhoneOtp(phoneNumber, recaptchaContainerId) {
  const auth = getFirebaseAuth()
  recaptchaVerifier?.clear()
  recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' })

  try {
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber.trim(), recaptchaVerifier)
    return confirmationResult;
  } catch (error) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
    throw error;
  }
}

// Sends the user-entered OTP to Firebase. Firebase validates the code and
// returns the signed-in user when it is correct.
export async function validatePhoneOtp(code) {
  if (!confirmationResult) throw new Error('Request a verification code before validating it.')
  return confirmationResult.confirm(code.trim())
}

export function clearPhoneOtpSession() {
  recaptchaVerifier?.clear()
  recaptchaVerifier = null
  confirmationResult = null
}
