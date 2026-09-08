import { useEffect, useState } from "react";
import { Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";

import { clearPhoneOtpSession } from "../../services/firebase";
import {
  sendOtp,
  sendPhoneOtp,
  verifyOtp,
  verifyPhoneOtp,
} from "../../services/user.services";
import useLoginStore from "../../store/useLoginStore";
import useUserStore from "../../store/useUserStore";
import countries from "../../utils/countries";
import authVisual from "../../assets/auth-visual.jpg";
import {
  Alert,
  GhostButton,
  Label,
  PrimaryButton,
  TextInput,
} from "../../components/common/Field";

// Friendlier copy for the Firebase error codes the phone flow can return.
const firebaseErrors = {
  "auth/invalid-phone-number":
    "Enter a valid phone number with country code, for example +91 9876543210.",
  "auth/invalid-verification-code": "That code is not valid. Please try again.",
  "auth/code-expired": "That code has expired. Request a new one.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
};

function readableError(error) {
  if (!error) return "Something went wrong. Please try again.";
  if (typeof error === "string") return error;
  return (
    firebaseErrors[error.code] ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

export default function Login() {
  const [method, setMethod] = useState("phone"); // "phone" | "email"
  const [dialCode, setDialCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const setUserPhoneData = useLoginStore((state) => state.setUserPhoneData);
  const setSteps = useLoginStore((state) => state.setSteps);
  const setUser = useUserStore((state) => state.setUser);

  // Clean up the invisible reCAPTCHA when the screen unmounts.
  useEffect(() => () => clearPhoneOtpSession(), []);

  function switchMethod(next) {
    if (next === method) return;
    clearPhoneOtpSession();
    setMethod(next);
    setOtpSent(false);
    setCode("");
    setError("");
    setMessage("");
  }

  function startOver() {
    clearPhoneOtpSession();
    setOtpSent(false);
    setCode("");
    setError("");
    setMessage("");
    setSteps(1);
  }

  async function handleSendOtp(event) {
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
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result =
        method === "phone"
          ? await verifyPhoneOtp(code)
          : await verifyOtp(email.trim(), code.trim());

      if (result?.data) setUser(result.data);
      setMessage("You're signed in. Welcome to WeChat!");
      setSteps(3);
    } catch (verifyError) {
      setError(readableError(verifyError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden lg:block">
        <img
          src={authVisual}
          alt="Soft plum and lavender illustration of two chat bubbles"
          width={1024}
          height={1280}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.25_0.09_330/0.75)] via-transparent to-[oklch(0.25_0.09_330/0.25)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-card/90 text-primary shadow-sm">
              <MessageCircle className="size-6" strokeWidth={2.2} />
            </span>
            <span className="text-xl font-semibold tracking-tight text-white">WeChat</span>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl leading-tight font-semibold tracking-tight text-white">
              Connect. Chat. Stay Close.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/85">
              Real-time messaging, status updates and everyone you care about — in one
              calm, uncluttered space.
            </p>
          </div>
        </div>
      </section>

      {/* Auth panel */}
      <section className="flex min-h-screen items-center justify-center px-6 py-12 lg:min-h-0">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <MessageCircle className="size-5" strokeWidth={2.2} />
            </span>
            <span className="text-lg font-semibold tracking-tight">WeChat</span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {otpSent ? "Enter your code" : "Welcome back"}
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {otpSent
              ? "We just sent you a 6-digit verification code."
              : "Sign in with a one-time code — no password to remember."}
          </p>

          {!otpSent && (
            <div
              role="tablist"
              aria-label="Sign in method"
              className="mt-8 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
            >
              {[
                { id: "phone", label: "Phone", Icon: Phone },
                { id: "email", label: "Email", Icon: Mail },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={method === id}
                  type="button"
                  onClick={() => switchMethod(id)}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all ${
                    method === id
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}
            className="mt-6 space-y-5"
          >
            {!otpSent && method === "phone" && (
              <div>
                <Label htmlFor="phone">Phone number</Label>
                <div className="flex gap-2">
                  <select
                    aria-label="Country dial code"
                    value={dialCode}
                    onChange={(event) => setDialCode(event.target.value)}
                    className="h-12 w-28 shrink-0 rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  >
                    {countries.map((country) => (
                      <option
                        key={`${country.alpha2}${country.dialCode}`}
                        value={country.dialCode}
                      >
                        {country.flag} {country.dialCode}
                      </option>
                    ))}
                  </select>
                  <TextInput
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="98765 43210"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {!otpSent && method === "email" && (
              <div>
                <Label htmlFor="email">Email address</Label>
                <TextInput
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            )}

            {otpSent && (
              <div>
                <Label htmlFor="code">Verification code</Label>
                <TextInput
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  className="text-center text-lg tracking-[0.5em]"
                />
              </div>
            )}

            <PrimaryButton type="submit" loading={loading}>
              {otpSent ? "Verify and continue" : "Send code"}
            </PrimaryButton>

            {otpSent && (
              <div className="flex justify-center">
                <GhostButton type="button" onClick={startOver} disabled={loading}>
                  {method === "phone" ? "Use a different number" : "Use a different email"}
                </GhostButton>
              </div>
            )}
          </form>

          {/* Firebase renders its invisible reCAPTCHA here. */}
          <div id="recaptcha-container" className="mt-2" />

          <div className="mt-5 space-y-3">
            {message && <Alert tone="success">{message}</Alert>}
            {error && <Alert tone="error">{error}</Alert>}
          </div>

          <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Your messages stay private. Codes expire after a few minutes.
          </p>
        </div>
      </section>
    </main>
  );
}
