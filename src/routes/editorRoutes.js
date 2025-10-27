import { Router } from "express";
import { getFile } from "../controllers/fileController.js";
import { listAnchors, upsertAnchor, deleteAnchor as deleteLegacyAnchor } from "../controllers/anchorController.js";
import { 
  getDocument,
  listDocuments,
  createDocument, 
  upsertDoc, 
  deleteDocument,
  addAnchor,
  updateAnchor,
  deleteAnchor
} from "../controllers/docController.js";

const router = Router();

// files (GET raw content by repoKey + path)
router.get("/files", getFile);

// documents (new unified API with embedded anchors)
router.get("/documents/list", listDocuments);     // GET /api/documents/list?repoKey=owner/repo
router.get("/documents", getDocument);           // GET /api/documents?repoKey=owner/repo&path=src/file.js
router.post("/documents", createDocument);        // POST /api/documents (body: { repoKey, path, body?, content? })
router.put("/documents", upsertDoc);             // PUT /api/documents (body: { repoKey, path, body?, content? })
router.delete("/documents", deleteDocument);      // DELETE /api/documents?repoKey=owner/repo&path=src/file.js

// anchors (within documents)
router.post("/documents/anchors", addAnchor);           // POST /api/documents/anchors
router.put("/documents/anchors/:anchorId", updateAnchor); // PUT /api/documents/anchors/:anchorId
router.delete("/documents/anchors/:anchorId", deleteAnchor); // DELETE /api/documents/anchors/:anchorId

// legacy anchors (kept for backward compatibility)
router.get("/anchors", listAnchors);
router.post("/anchors", upsertAnchor);
router.delete("/anchors/:id", deleteLegacyAnchor);

export default router;
