import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearPhoneOtpSession } from "../../services/firebase";
import {
  sendOtp,
  sendPhoneOtp,
  verifyOtp,
  verifyPhoneOtp,
} from "../../services/user.services";
import useLoginStore from "../../../store/useLoginStore";
import useUserStore from "../../../store/useUserStore";
import countries from "../../utils/countries";
import "./login.css";

const firebaseErrors = {
  "auth/invalid-phone-number": "Enter a valid phone number with country code.",
  "auth/invalid-verification-code": "That code is not valid. Please try again.",
  "auth/code-expired": "That code has expired. Request a new one.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
};

const readableError = (error) => {
  if (!error) return "Something went wrong. Please try again.";
  if (typeof error === "string") return error;
  return firebaseErrors[error.code] || error.message || "Something went wrong. Please try again.";
};

function Login() {
  const [method, setMethod] = useState("phone");
  const [dialCode, setDialCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const setSteps = useLoginStore((state) => state.setSteps);
  const setUserPhoneData = useLoginStore((state) => state.setUserPhoneData);
  const setUser = useUserStore((state) => state.setUser);
  const navigate = useNavigate();

  useEffect(() => () => clearPhoneOtpSession(), []);

  const resetOtpState = () => {
    clearPhoneOtpSession();
    setOtpSent(false);
    setCode("");
    setError("");
    setMessage("");
    setSteps(1);
  };

  const switchMethod = (nextMethod) => {
    if (nextMethod === method) return;
    resetOtpState();
    setMethod(nextMethod);
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (method === "phone") {
        const fullNumber = `${dialCode}${phoneNumber.replace(/\D/g, "")}`;
        await sendPhoneOtp(fullNumber, "recaptcha-container");
        setUserPhoneData({ phoneNumber: fullNumber });
        setMessage(`We sent a 6-digit code to ${fullNumber}.`);
      } else {
        await sendOtp(email.trim());
        setMessage(`We sent a 6-digit code to ${email.trim()}.`);
      }

      setOtpSent(true);
      setSteps(2);
    } catch (sendError) {
      setError(readableError(sendError));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = method === "phone"
        ? await verifyPhoneOtp(code)
        : await verifyOtp(email.trim(), code.trim());

      const account = method === "phone" ? result?.data : result?.data?.user;
      if (!account) throw new Error("Your account could not be loaded after verification.");
      setUser({ ...account, _id: account._id || account.id });
      setSteps(3);
      navigate("/chat");
    } catch (verifyError) {
      setError(readableError(verifyError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-visual" aria-hidden="true">
        <div className="visual-brand"><span>◌</span> WeChat</div>
        <div className="visual-copy">
          <h2>Connect. Chat.<br />Stay close.</h2>
          <p>Real-time messaging, status updates and everyone you care about — in one calm, uncluttered space.</p>
        </div>
        <div className="chat-orbit">
          <span className="bubble bubble-one">Hi!</span>
          <span className="bubble bubble-two">◌</span>
          <span className="bubble bubble-three">✦</span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand"><span>◌</span> WeChat</div>
          <h1>{otpSent ? "Enter your code" : "Welcome back"}</h1>
          <p className="login-subtitle">
            {otpSent ? "We just sent you a 6-digit verification code." : "Sign in with a one-time code — no password to remember."}
          </p>

          {!otpSent && (
            <div className="method-switch" role="tablist" aria-label="Sign in method">
              <button type="button" role="tab" aria-selected={method === "phone"} className={method === "phone" ? "active" : ""} onClick={() => switchMethod("phone")}>Phone</button>
              <button type="button" role="tab" aria-selected={method === "email"} className={method === "email" ? "active" : ""} onClick={() => switchMethod("email")}>Email</button>
            </div>
          )}

          <form className="login-form" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
            {!otpSent && method === "phone" && (
              <label>
                <span>Phone number</span>
                <div className="phone-input">
                  <select value={dialCode} onChange={(event) => setDialCode(event.target.value)} aria-label="Country dial code">
                    {countries.map((country) => <option key={country.alpha2} value={country.dialCode}>{country.flag} {country.dialCode}</option>)}
                  </select>
                  <input type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required />
                </div>
              </label>
            )}

            {!otpSent && method === "email" && (
              <label>
                <span>Email address</span>
                <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
            )}

            {otpSent && (
              <label>
                <span>Verification code</span>
                <input className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength="6" placeholder="••••••" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required />
              </label>
            )}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Please wait…" : otpSent ? "Verify and continue" : "Send code"}
            </button>

            {otpSent && <button className="text-button" type="button" onClick={resetOtpState} disabled={loading}>Use a different {method === "phone" ? "number" : "email"}</button>}
          </form>

          <div id="recaptcha-container" />
          {message && <p className="feedback success" role="status">{message}</p>}
          {error && <p className="feedback error" role="alert">{error}</p>}
          <p className="privacy-note">◈ Your messages stay private. Codes expire after a few minutes.</p>
        </div>
      </section>
    </main>
  );
}

export default Login;
