import "dotenv/config.js";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { connectDB } from "./src/models/db.js";

import userRoutes from "./src/routes/userRoutes.js";
import editorRoutes from "./src/routes/editorRoutes.js";
import docRoutes from "./src/routes/docRoutes.js";
import projectPageRoutes from "./src/routes/projectPage.routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.use((req, _res, next) => { console.log(`${req.method} ${req.url}`); next(); });

app.use("/api", userRoutes);
app.use("/api", editorRoutes);
app.use("/api", docRoutes);
app.use("/api", projectPageRoutes);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "internal error" });
});

const start = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running → http://localhost:${PORT}`));
};
start();
