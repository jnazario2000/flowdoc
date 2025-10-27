import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { connectDB } from "./src/models/db.js";

import userRoutes from "./src/routes/userRoutes.js";
import editorRoutes from "./src/routes/editorRoutes.js";
import docRoutes from "./src/routes/docRoutes.js";
import projectPageRoutes from "./src/routes/projectPage.routes.js";
import editHistoryRoutes from "./src/routes/editHistoryRoutes.js";
//import AIDocRoutes from "./src/routes/AIDocRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS to allow credentials
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

app.use((req, _res, next) => { console.log(`${req.method} ${req.url}`); next(); });

app.use("/api", userRoutes);
app.use("/api", editorRoutes);
app.use("/api", docRoutes);
app.use("/api", projectPageRoutes);
app.use("/api", editHistoryRoutes);
//app.use("/api/docs", AIDocRoutes);


app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "internal error" });
});

const start = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running → http://localhost:${PORT}`));
};
start();
