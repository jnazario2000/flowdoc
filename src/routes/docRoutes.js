import { Router } from "express";
import { getFile } from "../controllers/fileController.js";

const router = Router();

// GET /api/files?repoKey=<owner/repo>&path=<path>[&branch=main]
router.get("/files", getFile);

export default router;
