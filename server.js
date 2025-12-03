import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./src/models/db.js";

import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import editorRoutes from "./src/routes/editorRoutes.js";
import docRoutes from "./src/routes/docRoutes.js";
import projectPageRoutes from "./src/routes/projectPage.routes.js";
import editHistoryRoutes from "./src/routes/editHistoryRoutes.js";
import AIDocRoutes from "./src/routes/AIDocRoutes.js";
import repositoryRoutes from "./src/routes/repositoryRoutes.js";
import invitationRoutes from "./src/routes/invitationRoutes.js";

import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0"; // Listen on all network interfaces

// Auto-detect production mode: if dist folder exists, assume production
const distPath = path.join(__dirname, "dist");
const hasDistFolder = fs.existsSync(distPath);
const NODE_ENV = process.env.NODE_ENV || (hasDistFolder ? "production" : "development");

// ============================
// 🔵 Dynamic CORS Setup
// ============================

// Helper function to get local IP address
// Prefers real network IPs (192.168.x.x, 10.x.x.x) over virtual ones (WSL/Docker 172.x.x.x)
async function getLocalIP() {
  try {
    const { networkInterfaces } = await import("os");
    const nets = networkInterfaces();
    
    const candidates = [];
    
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === "IPv4" && !net.internal) {
          candidates.push(net.address);
        }
      }
    }
    
    // Prefer common home/office network ranges over virtual network IPs
    // 192.168.x.x and 10.x.x.x are typically real WiFi/Ethernet
    // 172.16-31.x.x can be WSL, Docker, or corporate networks
    const preferredIP = candidates.find(ip => 
      ip.startsWith("192.168.") || ip.startsWith("10.")
    );
    
    return preferredIP || candidates[0] || "localhost";
  } catch (error) {
    console.error("Error getting IP:", error);
  }
  return "localhost";
}

// Build allowed origins based on environment
let allowedOrigins = [];

// Add the dynamic network IP origin
(async () => {
  const localIP = await getLocalIP();
  
  if (NODE_ENV === "production") {
    // In production, frontend is served from the same server (port 3000)
    allowedOrigins.push(`http://localhost:${PORT}`);
    allowedOrigins.push(`http://${localIP}:${PORT}`);
  } else {
    // In development, Vite dev server runs on port 5173
    allowedOrigins.push("http://localhost:5173");
    allowedOrigins.push(`http://${localIP}:5173`);
  }
  
  console.log("✅ Allowed CORS Origins:", allowedOrigins);
})();

// CORS config
const corsOptions = {
  origin: (origin, callback) => {
    // Allow no-origin requests (Postman, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// ============================
// Logging middleware
// ============================
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ============================
// API Routes
// ============================
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", editorRoutes);
app.use("/api", docRoutes);
app.use("/api", projectPageRoutes);
app.use("/api", editHistoryRoutes);
app.use("/api/docs", AIDocRoutes);
app.use("/api", repositoryRoutes);
app.use("/api", invitationRoutes);

// ============================
// Production: Serve React
// ============================
if (NODE_ENV === "production") {
  app.use(express.static(distPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ============================
// Error handling
// ============================
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "internal error" });
});

// ============================
// Start server
// ============================
const start = async () => {
  try {
    await connectDB();

    app.listen(PORT, HOST, async () => {
      const localIP = await getLocalIP();
      console.log(`
========================================
🚀 Server Started Successfully!
========================================
Environment: ${NODE_ENV}
Port: ${PORT}
Host: ${HOST}

Network Access:
- Local:   http://localhost:${PORT}
- Network: http://${localIP}:${PORT}

Share with users on same WiFi:
http://${localIP}:${PORT}
========================================
      `);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();
