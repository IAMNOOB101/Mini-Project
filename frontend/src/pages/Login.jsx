import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const successMsg = location.state?.message || "";

  const [form, setForm] = useState({ email: "", password: "" });
  const [totpToken, setTotpToken] = useState("");
  const [step, setStep] = useState("email"); // "email" | "totp" | "password"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let body = {};
      if (step === "email") body = { email: form.email };
      else if (step === "totp") body = { email: form.email, totpToken };
      else if (step === "password") body = { email: form.email, password: form.password };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) return setError(data.message || "Login failed");

      // Server signals next required step
      if (data.totpRequired) {
        setStep("totp");
        return;
      }
      if (data.passwordRequired) {
        setStep("password");
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
          {step === "email" && <p>Sign in to your InterviewAI account</p>}
          {step === "totp" && <p>Enter the 6-digit code from your Authenticator app</p>}
          {step === "password" && <p>Enter your password to continue</p>}
        </div>

        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        {step === "email" && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email" name="email" type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange} required autoComplete="email"
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading || !form.email}>
              {loading ? "Checking…" : "Continue"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/guest-interview")}
              className="btn-guest"
            >
              Continue as Guest
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="password">Password for {form.email}</label>
              <input
                id="password" name="password" type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange} required autoComplete="current-password"
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading || !form.password}>
              {loading ? "Signing in…" : "Login"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => { setStep("email"); setError(""); setForm({ ...form, password: "" }); }}>
              ← Use a different email
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
            
            <div className="btn-row" style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
              <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => { setStep("email"); setError(""); setTotpToken(""); }}>
                ← Back
              </button>
              <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => { setStep("password"); setError(""); setTotpToken(""); }}>
                Use Password Instead
              </button>
            </div>
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
