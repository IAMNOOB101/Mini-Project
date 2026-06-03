import app from "./app.js";
import dotenv from "dotenv";
import { sequelize } from "./db/index.js";

dotenv.config();

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Server start timestamp for detecting restarts
const SERVER_START_TIME = new Date().toISOString();

// Health check endpoint (no auth required)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    startTime: SERVER_START_TIME,
    timestamp: new Date().toISOString(),
  });
});

const startServer = async (retries = 10) => {
  for (let i = 1; i <= retries; i++) {
    try {
      await sequelize.authenticate();
      await sequelize.sync({ alter: true });
      console.log("✓ PostgreSQL connected and models synced");
      const port = process.env.PORT || 4000;
      app.listen(port, () => console.log(`✓ Server running on port ${port}`));
      return;
    } catch (err) {
      console.error(`DB attempt ${i}/${retries}: ${err.message}`);
      if (i >= retries) { console.error("Giving up."); process.exit(1); }
      await wait(3000);
    }
  }
};

startServer();
