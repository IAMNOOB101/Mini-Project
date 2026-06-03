import { Link } from "react-router-dom";

const features = [
  { icon: "📄", title: "Resume-driven Questions", desc: "Questions tailored to your skills, domain, and target salary — not generic." },
  { icon: "🎙️", title: "Voice & Confidence Analysis", desc: "Real-time speech-to-text and voice confidence scoring while you answer." },
  { icon: "🧠", title: "AI Evaluation", desc: "Every answer graded on content, clarity and confidence by advanced AI." },
  { icon: "📊", title: "Explainable Reports", desc: "Downloadable PDF with strengths, improvement areas and progress tracking." },
  { icon: "🏛️", title: "Institution Plans", desc: "Bulk access for colleges and bootcamps with per-student pricing." },
  { icon: "🔐", title: "2FA Security", desc: "TOTP authenticator support for Google Authenticator and Authy." },
];

export default function Home() {
  return (
    <div className="home">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-pill">🚀 Now powered by Gemini 2.0 Flash</span>
          <h1 className="hero-headline">Ace your next interview with AI-powered practice</h1>
          <p className="hero-sub">
            Domain-specific questions, real-time analysis, and actionable feedback — for students and professionals.
          </p>
          <div className="hero-cta">
            <Link to="/signup" className="btn-primary" style={{ width: "auto", display: "inline-block", padding: "0.9rem 2rem", textDecoration: "none", borderRadius: 8 }}>
              Start Free →
            </Link>
            <Link to="/login" className="btn-ghost" style={{ width: "auto", display: "inline-block", padding: "0.9rem 2rem", textDecoration: "none", borderRadius: 8 }}>
              Sign In
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card-demo">
            <div className="demo-bar">
              <span className="demo-dot red" /><span className="demo-dot yellow" /><span className="demo-dot green" />
            </div>
            <p className="demo-q">💬 Explain how a REST API handles authentication.</p>
            <div className="demo-scores">
              {[["Content", 8.5], ["Clarity", 7.8], ["Confidence", 8.2]].map(([l, v]) => (
                <div key={l} className="demo-score-row">
                  <span>{l}</span>
                  <div className="demo-bar-outer"><div className="demo-bar-inner" style={{ width: `${v * 10}%` }} /></div>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <h2 style={{ textAlign: "center", marginBottom: "0.5rem" }}>Everything you need</h2>
        <p style={{ textAlign: "center", marginBottom: "3rem", color: "var(--text-muted)" }}>
          One platform for practice, analysis and improvement.
        </p>
        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="cta-band">
        <h2>Ready to level up?</h2>
        <p>Join thousands of students and professionals practising smarter.</p>
        <Link to="/signup" className="btn-primary" style={{ width: "auto", display: "inline-block", padding: "0.9rem 2.5rem", textDecoration: "none", borderRadius: 8, background: "#fff", color: "var(--primary)" }}>
          Create Free Account
        </Link>
      </section>

      <footer className="home-footer">
        <p>© {new Date().getFullYear()} InterviewAI · All rights reserved.</p>
      </footer>
    </div>
  );
}
