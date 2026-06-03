import React from "react";
import { Link } from "react-router-dom";

export default function UserHome() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch (_) {}

  return (
    <div className="page-container" style={{ textAlign: "center", marginTop: "2rem" }}>
      <div className="hero-section" style={{ position: "relative", padding: "4rem 2rem", borderRadius: "1.5rem", marginBottom: "3rem", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ marginBottom: "1rem" }}>
            Ready for your next challenge, {user?.firstName || "there"}? 🚀
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1.15rem", maxWidth: "650px", margin: "0 auto 2.5rem", lineHeight: "1.6" }}>
            Continue practicing with domain-specific questions, get real-time AI-powered feedback, and track your interview progress.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/interview" className="btn-primary" style={{ textDecoration: "none", width: "auto" }}>
              Start Mock Interview
            </Link>
            <Link to="/dashboard" className="btn-ghost" style={{ textDecoration: "none", width: "auto" }}>
              View Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="cards-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", textAlign: "left" }}>
        <div className="card" style={{ padding: "2.5rem", transition: "transform 0.2s" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📊</div>
          <h3 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Track Progress</h3>
          <p style={{ color: "var(--text-muted)", lineHeight: "1.5" }}>
            Review your past interviews and see how your confidence and clarity scores have improved over time.
          </p>
        </div>
        <div className="card" style={{ padding: "2.5rem", transition: "transform 0.2s" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🧠</div>
          <h3 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>AI Analysis</h3>
          <p style={{ color: "var(--text-muted)", lineHeight: "1.5" }}>
            Every answer is evaluated for content, delivery, and confidence by Gemini 2.0 to help you improve.
          </p>
        </div>
        <div className="card" style={{ padding: "2.5rem", transition: "transform 0.2s" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📄</div>
          <h3 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Resume Driven</h3>
          <p style={{ color: "var(--text-muted)", lineHeight: "1.5" }}>
            Keep your profile up to date to get questions tailored specifically to your actual skills and experience.
          </p>
          <Link to="/profile" className="btn-ghost" style={{ marginTop: "1.5rem", display: "inline-block", textDecoration: "none", padding: "0.5rem 1rem" }}>
            Update Profile →
          </Link>
        </div>
      </div>
    </div>
  );
}
