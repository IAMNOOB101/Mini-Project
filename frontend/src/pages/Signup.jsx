import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css";

const STEPS = ["Account & Resume", "Profile Details", "Setup Authenticator"];

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "",
    accountType: "professional", enrollmentNumber: "",
    domain: "", role: "", experience: "", desiredSalary: "",
    skills: "", education: "",
  });
  const [resume, setResume] = useState(null);
  const [resumeError, setResumeError] = useState("");
  const [resumeParsed, setResumeParsed] = useState(false);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [totpQr, setTotpQr] = useState(null);
  const [totpToken, setTotpToken] = useState("");
  const [totpError, setTotpError] = useState("");
  const [totpVerifying, setTotpVerifying] = useState(false);
  const [authToken, setAuthToken] = useState(null); // temp token after register

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleResumeChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) { setResume(null); setResumeError(""); return; }
    if (file.type !== "application/pdf") { setResumeError("Only PDF files are allowed"); setResume(null); return; }
    if (file.size > 5 * 1024 * 1024) { setResumeError("File size must be less than 5MB"); setResume(null); return; }
    setResume(file);
    setResumeError("");
    setResumeParsed(false);

    // Auto-parse resume to fill form fields
    setResumeParsing(true);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      const res = await fetch("/api/resume/parse", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (res.ok) {
        const { data } = await res.json();
        if (data) {
          setForm((prev) => ({
            ...prev,
            firstName: data.firstName || prev.firstName,
            lastName: data.lastName || prev.lastName,
            email: data.email || prev.email,
            skills: data.skills?.join(", ") || prev.skills,
            experience: data.experience || prev.experience,
            domain: data.domain || prev.domain,
            role: data.role || prev.role,
            education: data.education || prev.education,
          }));
          setResumeParsed(true);
        }
      }
    } catch (_) { /* parsing is optional */ }
    setResumeParsing(false);
  };

  const goNext = (e) => {
    e.preventDefault();
    setError("");
    if (!form.firstName || !form.email || !form.password || !form.accountType) {
      return setError("Please fill in all required fields");
    }
    if (form.password.length < 8) return setError("Password must be at least 8 characters");
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (resume) fd.append("resume", resume);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Registration failed");

      // Store temp auth token to call TOTP init
      setAuthToken(data.token);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Fetch TOTP QR
      const totpRes = await fetch("/api/auth/totp/init", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.token}` },
        credentials: "include",
      });
      const totpData = await totpRes.json();
      setTotpQr(totpData.qrCode);
      setStep(2);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleTotpConfirm = async (e) => {
    e.preventDefault();
    setTotpError("");
    setTotpVerifying(true);
    try {
      const res = await fetch("/api/auth/totp/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token: totpToken }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) return setTotpError(data.message || "Invalid code");
      // Success — redirect to dashboard
      navigate("/dashboard", { state: { message: "Account created! 2FA is active." } });
    } catch {
      setTotpError("Network error — please try again");
    } finally {
      setTotpVerifying(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-header">
          <div className="auth-icon">🚀</div>
          <h1>Create Account</h1>
          <p>Step {step + 1} of {STEPS.length}: <strong>{STEPS[step]}</strong></p>
        </div>

        <div className="step-indicator">
          {STEPS.map((s, i) => (
            <div key={s} className={`step-dot ${i <= step ? "active" : ""}`} />
          ))}
        </div>

        {/* ── Step 0: Account basics + resume ── */}
        {step === 0 && (
          <form onSubmit={goNext} className="auth-form">
            <div className="form-group">
              <label>📄 Upload Resume (PDF) — auto-fills your profile</label>
              <div className="file-input-wrapper">
                <input type="file" accept=".pdf" onChange={handleResumeChange} style={{ width: "100%" }} />
              </div>
              {resumeParsing && <p className="form-hint">⏳ Extracting details from resume…</p>}
              {resumeParsed && <p className="form-hint" style={{ color: "var(--success)" }}>✅ Resume parsed — fields pre-filled below</p>}
              {resume && !resumeParsed && !resumeParsing && <p className="form-hint">✓ Selected: {resume.name}</p>}
              {resumeError && <div className="alert alert-error">{resumeError}</div>}
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>First Name *</label>
                <input name="firstName" placeholder="John" onChange={handleChange} value={form.firstName} required />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input name="lastName" placeholder="Doe" onChange={handleChange} value={form.lastName} />
              </div>
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input name="email" type="email" placeholder="you@example.com" onChange={handleChange} value={form.email} required autoComplete="email" />
            </div>
            <div className="form-group">
              <label>Password * (min. 8 characters)</label>
              <input name="password" type="password" placeholder="••••••••" onChange={handleChange} value={form.password} required autoComplete="new-password" />
            </div>

            <div className="form-group">
              <label>Account Type *</label>
              <select name="accountType" onChange={handleChange} value={form.accountType}>
                <option value="professional">Professional</option>
                <option value="student">Student (Institution)</option>
              </select>
            </div>

            {form.accountType === "student" && (
              <div className="form-group">
                <label>Enrollment Number</label>
                <input name="enrollmentNumber" placeholder="EN2024001" onChange={handleChange} value={form.enrollmentNumber} />
                <span className="form-hint">Your institutional email must be from an approved domain</span>
              </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}
            <button type="submit" className="btn-primary">Next →</button>
          </form>
        )}

        {/* ── Step 1: Profile details ── */}
        {step === 1 && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Target Domain *</label>
              <input name="domain" placeholder="e.g. Software Engineering" onChange={handleChange} value={form.domain} required />
            </div>
            <div className="form-group">
              <label>Desired Role *</label>
              <input name="role" placeholder="e.g. Backend Developer" onChange={handleChange} value={form.role} required />
            </div>
            <div className="form-group">
              <label>Skills (comma-separated)</label>
              <input name="skills" placeholder="e.g. React, Node.js, SQL" onChange={handleChange} value={form.skills} />
            </div>
            <div className="form-group">
              <label>Experience Level *</label>
              <select name="experience" onChange={handleChange} value={form.experience} required>
                <option value="">Select level</option>
                <option value="Fresher">Fresher (0 yrs)</option>
                <option value="Junior">Junior (1–3 yrs)</option>
                <option value="Mid">Mid-level (3–6 yrs)</option>
                <option value="Senior">Senior (6+ yrs)</option>
              </select>
            </div>

            {form.experience === "Fresher" && (
              <div className="form-group">
                <label>Education</label>
                <input name="education" placeholder="e.g. B.Tech CSE, XYZ University, 2024" onChange={handleChange} value={form.education} />
              </div>
            )}

            <div className="form-group">
              <label>Expected Salary</label>
              <input name="desiredSalary" placeholder="e.g. 8 LPA" onChange={handleChange} value={form.desiredSalary} />
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            <div className="btn-row">
              <button type="button" className="btn-ghost" onClick={() => setStep(0)}>← Back</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Creating account…" : "Create Account →"}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: TOTP Setup ── */}
        {step === 2 && (
          <div className="form-group">
            <label>Setup Two-Factor Authentication (2FA)</label>
            <p className="text-sm text-gray-600 mb-4">
              Scan this QR code with Google Authenticator or Authy
            </p>

            {/* QR Code Display */}
            {qrCode ? (
              <div className="qr-code-container">
                <img
                  src={qrCode}
                  alt="2FA QR Code"
                  className="qr-code-image"
                />
              </div>
            ) : (
              <div className="loading-spinner">
                <p>Generating QR code...</p>
              </div>
            )}

            {/* 6-Digit Code Input */}
            <div className="form-group mt-4">
              <label>6-Digit Authenticator Code *</label>
              <input
                type="text"
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.slice(0, 6))}
                className="form-input text-center tracking-widest"
                maxLength="6"
              />
            </div>

            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
        )}

        {step < 2 && (
          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Login</Link></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Signup;
