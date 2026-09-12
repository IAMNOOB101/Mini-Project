import { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./router";
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/theme.css";

export default function App() {
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await fetch("/api/health", {
          method: "GET",
        });

        if (response.status === 200) {
          const data = await response.json();
          const serverStartTime = data.startTime;

          const lastServerTime = localStorage.getItem("serverStartTime");

          if (lastServerTime && lastServerTime !== serverStartTime) {
            console.log("🔄 Server restarted, logging out...");

            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("serverStartTime");

            window.location.href = "/login";
          } else {
            localStorage.setItem("serverStartTime", serverStartTime);
          }
        }
      } catch (err) {
        console.error("Health check failed:", err);
      }
    };

    checkServerHealth();
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Navbar />
        <main className="app-container">
          <AppRoutes />
        </main>
      </Router>
    </ErrorBoundary>
  );
}