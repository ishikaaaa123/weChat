import { useEffect, useState } from "react";
import { clearPhoneOtpSession } from "../../services/firebase";
import { sendPhoneOtp, verifyPhoneOtp } from "../../services/user.services";
import "./login.css";
import useLoginStore from "../../../store/useLoginStore";
import * as yup from 'yup';
import {yupResolver} from '@hookform/resolvers'
import useUserStore from "../../../store/useUserStore";

const loginValidationSchema = yup.object().shape({
  email: yup
    .string()
    .nullable()
    .notRequired()
    .email("please enter valid email")
    .transform((value, originalValue) => {
      return originalValue.trim() === "" ? null : value;
    }),
});

const otpValidationSchema = yup.object().shape({
  otp: yup.string().length(6, "Otp must be excatly 6 digits").required("Otp is required")
});

const profileValidationSchema = yup.object().shape({
  username: yup.string().required("username is required"),
  agreed: yup.bool().oneOf([true], "You must agree to the terms")
});


const errors = {
  "auth/invalid-phone-number": "Enter a valid phone number with country code, for example +919876543210.",
  "auth/invalid-verification-code": "That verification code is not valid. Try again.",
  "auth/code-expired": "That code has expired. Request a new one.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
};

const readableError = (error) =>
  errors[error.code] || error.message || "Something went wrong. Please try again.";

function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("phone");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const {steps,userPhoneData,setSteps,setUserPhoneData,resetLoginState} = useLoginStore
  const [profilePicture, updateProfilePicture] = useState(null);
  useEffect(() => () => clearPhoneOtpSession(), []);
  const avatars = [
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe',
  ]
  const [avataar, setAvataar] = useState(avatars[0]);
  const navigate = useNavigation();
  const {setUser} = useUserStore();

  const {
    handleSubmit:handleOtpSubmit,
    formState:{errors:otpErrors},
    setValue:setOtpValue
  } = useForm({resolver:yupResolver(loginValidationSchema)})

  const {
    register:profileRegister,
    formState:{errors:profileErrors},
    handleSubmit:handleProfileSubmit,
    watch
  } = useForm({resolver:yupResolver(profileValidationSchema)})


  async function sendCode(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await sendPhoneOtp(phoneNumber, "recaptcha-container");
      setStep("code");
      setMessage(`A verification code was sent to ${phoneNumber.trim()}.`);
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = await verifyPhoneOtp(code);
      setMessage(`Signed in successfully as ${result.phoneNumber}.`);
    } catch (verifyError) {
      setError(readableError(verifyError));
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="page-title">
        <p className="brand">WeChat</p>
        <h1 id="page-title">Sign in with your phone</h1>
        <p className="intro">We’ll send a one-time verification code to confirm it’s you.</p>

        {step === "phone" ? (
          <form onSubmit={sendCode}>
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+919876543210"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              required
            />
            <p className="hint">Include your country code. For Firebase test numbers, use the configured test number.</p>
            <button type="submit" disabled={loading}>{loading ? "Sending…" : "Send code"}</button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <label htmlFor="code">Verification code</label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
            <button type="submit" disabled={loading}>{loading ? "Verifying…" : "Verify and sign in"}</button>
            <button
              className="link-button"
              type="button"
              onClick={() => {
                clearPhoneOtpSession();
                setStep("phone");
                setCode("");
                setMessage("");
              }}
              disabled={loading}
            >
              Use a different number
            </button>
          </form>
        )}

        <div id="recaptcha-container" />
        {message && <p className="status success" role="status">{message}</p>}
        {error && <p className="status error" role="alert">{error}</p>}
      </section>
    </main>
  );
}

export default Login;
