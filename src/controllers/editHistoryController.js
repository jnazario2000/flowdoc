// Purpose: Keep a simple history of edits to a document (who edited, what changed, when).

import * as svc from "../services/editHistoryService.js";
import { ObjectId } from "mongodb";

// Accepts header x-user-id or query ?userId= . Falls back to a random ObjectId string.
function getUserId(req) {
  return req.headers["x-user-id"] || req.query.userId || new ObjectId().toString();
}

// Body: { content, note? }  -> records a new edit.
export async function createEdit(req, res) {
  try {
    const { docId } = req.params;
    const { content, note } = req.body || {};
    if (!docId || !content) return res.status(400).json({ error: "docId and content are required" });

    const authorId = getUserId(req); // Replace with real user id from auth middleware later.
    const result = await svc.recordEdit({ docId, authorId, content, note });

    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "failed to record edit" });
  }
}


// Lists edits for a document (paginated).
export async function listEdits(req, res) {
  try {
    const { docId } = req.params;
    const limit = parseInt(req.query.limit || "20", 10);
    const skip = parseInt(req.query.skip || "0", 10);

    const edits = await svc.listEdits({ docId, limit, skip });
    return res.json(edits);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "failed to list edits" });
  }
}
