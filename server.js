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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

// Configure CORS based on environment
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || true // Allow all origins in production if FRONTEND_URL not set
    : 'http://localhost:5173', // Vite dev server for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Logging middleware
app.use((req, _res, next) => { 
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`); 
  next(); 
});

// API Routes
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", editorRoutes);
app.use("/api", docRoutes);
app.use("/api", projectPageRoutes);
app.use("/api", editHistoryRoutes);
app.use("/api/docs", AIDocRoutes);
app.use("/api", repositoryRoutes);
app.use("/api", invitationRoutes);

// Serve static files from the React app in production
if (NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));

  // Handle React routing - return all requests to React app
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "internal error" });
});

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
- Local: http://localhost:${PORT}
- Network: http://${localIP}:${PORT}

Share with users on school WiFi:
http://${localIP}:${PORT}
========================================
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Helper function to get local IP address
async function getLocalIP() {
  try {
    const { networkInterfaces } = await import('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // Skip internal and non-IPv4 addresses
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch (error) {
    console.error('Error getting IP:', error);
  }
  return 'localhost';
}

start();
