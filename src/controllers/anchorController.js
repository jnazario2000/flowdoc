// Purpose: Manage "anchors" = highlighted line ranges in a file (used to attach notes/docs to exact code lines).

import { ObjectId } from "mongodb";
import { state } from "../models/db.js"; // Mongo collections holder (state.anchors, state.files, etc.)


// Returns all saved anchors for a specific file, sorted by line number.
export async function listAnchors(req, res) {
  const { repoKey, path } = req.query;
  if (!repoKey || !path) return res.status(400).json({ error: "repoKey and path required" });

  const anchors = await state.anchors
    .find({ repoKey, path })
    .sort({ startLine: 1, endLine: 1, _id: 1 })
    .toArray();

  res.json({ anchors });
}

// Body: { repoKey, path, startLine, endLine, text?, docSpan?, anchorId? }
// - If anchorId is provided -> update; otherwise -> create.
export async function upsertAnchor(req, res) {
  const debug = { body: req.body };

  try {
    const { repoKey, path, startLine, endLine, text, docSpan, anchorId } = req.body || {};

    // Basic required fields
    if (!repoKey || !path || startLine == null || endLine == null) {
      return res.status(400).json({ error: "repoKey, path, startLine, endLine are required" });
    }

    // Simple validation to avoid garbage ranges
    const s = Number(startLine);
    const e = Number(endLine);
    if (!Number.isInteger(s) || !Number.isInteger(e) || s < 1 || e < 1 || s > e) {
      return res.status(400).json({ error: "startLine and endLine must be positive integers with start <= end" });
    }

    const now = new Date();

    if (anchorId) {
      // UPDATE an existing anchor. We also match repoKey+path so we don't accidentally move anchors across files.
      const _id = new ObjectId(anchorId);
      const { value } = await state.anchors.findOneAndUpdate(
        { _id, repoKey, path },
        { $set: { startLine: s, endLine: e, text: text ?? "", docSpan: docSpan ?? null, updatedAt: now } },
        { returnDocument: "after" }
      );
      if (!value) return res.status(404).json({ error: "anchor not found" });
      return res.json({ ok: true, anchor: value });
    }

    // CREATE a new anchor
    const doc = {
      repoKey,
      path,
      startLine: s,
      endLine: e,
      text: text ?? "",
      docSpan: docSpan ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const r = await state.anchors.insertOne(doc);
    return res.json({ ok: true, anchor: { ...doc, _id: r.insertedId } });
  } catch (e) {
    console.error("upsertAnchor 500", e, debug);
    return res.status(500).json({ error: "internal error" });
  }
}
// Removes a specific anchor by its ID.
export async function deleteAnchor(req, res) {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "id required" });

    const r = await state.anchors.deleteOne({ _id: new ObjectId(id) });
    if (!r.deletedCount) return res.status(404).json({ error: "not found" });

    return res.json({ ok: true });
  } catch (e) {
    console.error("deleteAnchor 500", e);
    return res.status(500).json({ error: "internal error" });
  }
}
