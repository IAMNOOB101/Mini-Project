import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  let user = null;
  try { user = JSON.parse(localStorage.getItem("user")); } catch (_) {}

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/interview/sessions", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setSessions(data.sessions || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load session history");
        setLoading(false);
      });
  }, []);

  const scoreColor = (score) => {
    if (!score) return "badge-blue";
    if (score >= 8) return "badge-green";
    if (score >= 5) return "badge-yellow";
    return "badge-red";
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "3rem" }}>
        <div>
          <h1>Welcome back{user?.firstName ? `, ${user.firstName}` : ""}! 👋</h1>
          <p style={{ fontSize: "1.1rem", marginTop: "0.5rem", color: "var(--text-muted)" }}>Track your interview practice progress</p>
        </div>
        <Link to="/interview" className="btn-primary" style={{ width: "auto", padding: "0.75rem 1.5rem", textDecoration: "none", borderRadius: 8, display: "inline-block" }}>
          + Start Interview
        </Link>
      </div>

      {/* Stats row */}
      <div className="cards-grid" style={{ marginBottom: "2rem" }}>
        <div className="stat-card">
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">Total Interviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {sessions.length
              ? (sessions.reduce((a, s) => a + (s.finalScore ?? 0), 0) / sessions.length).toFixed(1)
              : "—"}
          </div>
          <div className="stat-label">Avg. Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {sessions.filter((s) => (s.finalScore ?? 0) >= 8).length}
          </div>
          <div className="stat-label">Top Performances</div>
        </div>
      </div>

      {/* Session history */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Interview History</h2>
        </div>

        {loading && (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading sessions…
          </div>
        )}

        {error && <div className="alert alert-error" style={{ margin: "1rem" }}>{error}</div>}

        {!loading && sessions.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🎤</div>
            <h3>No interviews yet</h3>
            <p>Kick off your first mock interview and start improving!</p>
            <Link to="/interview" className="btn-primary" style={{ width: "auto", display: "inline-block", padding: "0.75rem 1.5rem", textDecoration: "none", borderRadius: 8, marginTop: "0.5rem" }}>
              Start First Interview
            </Link>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Domain</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Report</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{i + 1}</td>
                    <td><strong>{s.domain || "General"}</strong></td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                      {new Date(s.date || s.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td>
                      <span className={`badge ${scoreColor(s.finalScore)}`}>
                        {s.finalScore != null ? `${Number(s.finalScore).toFixed(1)} / 10` : "Pending"}
                      </span>
                    </td>
                    <td>
                      {s.expiresAt && Date.now() < new Date(s.expiresAt).getTime() ? (
                        <a
                          href={`/api/interview/report/${s.id}`}
                          style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.875rem", textDecoration: "none" }}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View ↗
                        </a>
                      ) : (
                        <span style={{ color: "var(--text-light)", fontSize: "0.8rem" }}>Expired</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
