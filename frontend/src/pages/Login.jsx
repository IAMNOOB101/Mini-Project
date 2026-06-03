import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const successMsg = location.state?.message || "";

  const [form, setForm] = useState({ email: "", password: "" });
  const [totpToken, setTotpToken] = useState("");
  const [step, setStep] = useState("credentials"); // "credentials" | "totp"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = step === "totp"
        ? { ...form, totpToken }
        : form;

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) return setError(data.message || "Login failed");

      // Server signals TOTP is required
      if (data.totpRequired) {
        setStep("totp");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user?.accountType === "admin") navigate("/admin");
      else navigate("/dashboard");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Guest login failed");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({ accountType: "guest", firstName: "Guest" }));
      navigate("/dashboard");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">🎯</div>
          <h1>Welcome Back</h1>
          {step === "credentials" && <p>Sign in to your InterviewAI account</p>}
          {step === "totp" && <p>Enter the 6-digit code from your Authenticator app</p>}
        </div>

        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        {step === "credentials" && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email" name="email" type="email"
                placeholder="you@example.com"
                onChange={handleChange} required autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password" name="password" type="password"
                placeholder="••••••••"
                onChange={handleChange} required autoComplete="current-password"
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Signing in…" : "Login"}
            </button>
            <button
              onClick={() => navigate("/guest-interview")}
              className="btn-guest"
            >
              Continue as Guest
            </button>
          </form>
        )}

        {step === "totp" && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="totpToken">Authenticator Code</label>
              <input
                id="totpToken" name="totpToken" type="text"
                inputMode="numeric" pattern="[0-9]{6}"
                maxLength={6} placeholder="000000"
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value)}
                autoComplete="one-time-code"
                required
                style={{ letterSpacing: "0.3em", fontSize: "1.5rem", textAlign: "center" }}
              />
              <span className="form-hint">Open Google Authenticator / Authy and enter the 6-digit code</span>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading || totpToken.length !== 6}>
              {loading ? "Verifying…" : "Verify & Login"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => { setStep("credentials"); setError(""); setTotpToken(""); }}>
              ← Back
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/signup">Register here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
