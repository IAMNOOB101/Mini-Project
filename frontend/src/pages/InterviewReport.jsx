import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getTranscript } from "../services/interview.service.js";

const POLL_INTERVAL_MS = 4000; // poll every 4 seconds while evaluating

const ScoreBar = ({ label, value }) => (
  <div style={{ marginBottom: "0.75rem" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>{label}</span>
      <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--primary)" }}>{value}/10</span>
    </div>
    <div style={{ height: 8, background: "var(--border)", borderRadius: 999 }}>
      <div style={{ height: "100%", width: `${(value / 10) * 100}%`, background: "linear-gradient(90deg, var(--primary), var(--accent))", borderRadius: 999, transition: "width 0.8s ease" }} />
    </div>
  </div>
);

export default function InterviewReport() {
  const { sessionId } = useParams();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const pollRef = useRef(null);

  const fetchReport = async () => {
    try {
      const r = await getTranscript(sessionId);
      const reportData = r.data;
      const finalReport = reportData.finalReport || {};

      if (finalReport.evaluating === true) {
        // Still generating — keep polling
        setData(reportData);
        setEvaluating(true);
        setLoading(false);
      } else {
        // Report ready
        setData(reportData);
        setEvaluating(false);
        setLoading(false);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load report");
      setLoading(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  };

  useEffect(() => {
    fetchReport();
  }, [sessionId]);

  useEffect(() => {
    if (evaluating && !pollRef.current) {
      pollRef.current = setInterval(fetchReport, POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [evaluating]);

  if (loading) return (
    <div className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
      <div className="spinner" />
      <p>Loading report…</p>
    </div>
  );

  if (error) return (
    <div className="page-container">
      <div className="alert alert-error">{error}</div>
      <Link to="/dashboard">← Back</Link>
    </div>
  );

  // Still evaluating — show progress screen
  if (evaluating || data?.finalReport?.evaluating) {
    return (
      <div className="page-container" style={{ textAlign: "center", paddingTop: "5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧠</div>
        <h2 style={{ marginBottom: "0.75rem" }}>Generating Your Report</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 420, margin: "0 auto 2rem" }}>
          Our AI is evaluating all your answers and generating personalised feedback. This typically takes 60–90 seconds.
        </p>
        <div className="spinner" style={{ margin: "0 auto" }} />
        <p style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Checking every {POLL_INTERVAL_MS / 1000} seconds…
        </p>
      </div>
    );
  }

  const report = data.finalReport || {};

  // Error during background evaluation
  if (report.error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">
          ⚠️ Report generation failed: {report.errorMessage || "Unknown error"}. Please try again later.
        </div>
        <Link to="/dashboard">← Back to Dashboard</Link>
      </div>
    );
  }

  const scores = report.scores || {};
  const level  = report.confidenceLevel || "—";
  const levelColor = level === "High" ? "badge-green" : level === "Low" ? "badge-red" : "badge-yellow";

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Interview Report</h1>
          <p>{data.domain || "General"} · {new Date(data.completedAt || data.startedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
        </div>
        <a href={`/api/interview/download/${sessionId}`} className="btn-primary" style={{ width: "auto", padding: "0.65rem 1.25rem", textDecoration: "none", display: "inline-block", borderRadius: 8 }}>
          ↓ Download PDF
        </a>
      </div>

      {/* Score overview */}
      <div className="cards-grid" style={{ marginBottom: "2rem" }}>
        {[["Overall", scores.overall], ["Content", scores.content], ["Clarity", scores.clarity], ["Confidence", scores.confidence]].map(([label, val]) => (
          <div key={label} className="stat-card">
            <div className="stat-value">{val != null ? Number(val).toFixed(1) : "—"}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "2rem" }}>
        {/* Summary */}
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>Summary</h2>
            <span className={`badge ${levelColor}`}>{level} Confidence</span>
          </div>
          <p style={{ color: "var(--text)", lineHeight: 1.7 }}>{report.summary || "—"}</p>
          {report.progressInsight && <div className="alert alert-info" style={{ marginTop: "1rem" }}>{report.progressInsight}</div>}
        </div>

        {/* Strengths */}
        <div className="card">
          <h3 style={{ color: "var(--success)", marginBottom: "0.75rem" }}>✅ Strengths</h3>
          <ul style={{ paddingLeft: "1.25rem", lineHeight: 2 }}>
            {(report.topStrengths || []).map((s, i) => <li key={i} style={{ color: "var(--text)" }}>{s}</li>)}
          </ul>
        </div>

        {/* Improvements */}
        <div className="card">
          <h3 style={{ color: "var(--warning)", marginBottom: "0.75rem" }}>🚀 Areas to Improve</h3>
          <ul style={{ paddingLeft: "1.25rem", lineHeight: 2 }}>
            {(report.topImprovements || []).map((s, i) => <li key={i} style={{ color: "var(--text)" }}>{s}</li>)}
          </ul>
        </div>

        {/* Recommendations */}
        {(report.recommendations || []).length > 0 && (
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <h3 style={{ color: "var(--primary)", marginBottom: "0.75rem" }}>📌 Recommendations</h3>
            <ul style={{ paddingLeft: "1.25rem", lineHeight: 2 }}>
              {report.recommendations.map((r, i) => <li key={i} style={{ color: "var(--text)" }}>{r}</li>)}
            </ul>
          </div>
        )}

        {/* Key Insight */}
        {report.keyInsight && (
          <div className="card" style={{ gridColumn: "1 / -1", background: "linear-gradient(135deg, var(--primary-dim, #ede9fe), var(--bg))", borderLeft: "4px solid var(--primary)" }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: "1rem" }}>💡 Key Insight</p>
            <p style={{ margin: "0.5rem 0 0", color: "var(--text)" }}>{report.keyInsight}</p>
          </div>
        )}

        {/* Salary Readiness */}
        {report.salaryReadiness && (
          <div className="card">
            <h3 style={{ marginBottom: "0.5rem" }}>💰 Salary Readiness</h3>
            <p style={{ color: "var(--text)", margin: 0 }}>{report.salaryReadiness}</p>
          </div>
        )}

        {/* Score bars */}
        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Score Breakdown</h3>
          {Object.entries(scores).map(([k, v]) => <ScoreBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={Number(v).toFixed(1)} />)}
        </div>
      </div>

      {/* Transcript */}
      {(data.transcript || []).length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Full Transcript</h2>
          </div>
          {data.transcript.map((t, i) => (
            <div key={i} style={{ padding: "1.25rem 1.5rem", borderBottom: i < data.transcript.length - 1 ? "1px solid var(--border)" : "none" }}>
              <p style={{ fontWeight: 700, color: "var(--text)", marginBottom: "0.4rem" }}>Q{i + 1}: {t.question}</p>
              <p style={{ color: "var(--text-muted)", marginBottom: "0.6rem", fontStyle: "italic" }}>{t.answer || "(no answer)"}</p>
              {t.evaluation && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {[["Content", t.evaluation.contentScore], ["Clarity", t.evaluation.clarityScore], ["Overall", t.evaluation.overallScore]].map(([l, v]) => (
                    <span key={l} className={`badge ${v >= 8 ? "badge-green" : v >= 5 ? "badge-blue" : "badge-red"}`}>{l}: {v}/10</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <Link to="/dashboard" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>← Back to Dashboard</Link>
      </div>
    </div>
  );
}
