// Purpose: Store and retrieve the long-form documentation text for a specific repo file.

import { state } from "../models/db.js";

// Returns saved documentation for a specific file (or empty string if none).
export async function getDocument(req, res) {
  const { repoKey, path } = req.query;
  if (!repoKey || !path) return res.status(400).json({ error: "repoKey and path required" });

  const row = await state.documents.findOne(
    { repoKey, path },
    { projection: { _id: 0, body: 1, updatedAt: 1 } }
  );

  return res.json({ body: row?.body || "", updatedAt: row?.updatedAt || null });
}

// Body: { repoKey, path, body }
// Creates or updates the documentation body for a specific file.
export async function upsertDoc(req, res) {
  const { repoKey, path, body } = req.body || {};
  if (!repoKey || !path) return res.status(400).json({ error: "repoKey and path required" });

  const now = new Date();
  const { value } = await state.documents.findOneAndUpdate(
    { repoKey, path },
    { $set: { body: body || "", updatedAt: now } },
    { upsert: true, returnDocument: "after" }
  );

  return res.json({ ok: true, updatedAt: value.updatedAt });
}
