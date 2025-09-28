import { Router } from "express";
import { getFile } from "../controllers/fileController.js";
import { listAnchors, upsertAnchor, deleteAnchor } from "../controllers/anchorController.js";

const router = Router();

// files (GET raw content by repoKey + path)
router.get("/files", getFile);

// anchors
router.get("/anchors", listAnchors);
router.post("/anchors", upsertAnchor);
router.delete("/anchors/:id", deleteAnchor);

export default router;
