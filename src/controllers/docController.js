// Purpose: Store and retrieve documents with embedded anchors for a specific repo file.

import { state } from "../models/db.js";
import { ObjectId } from "mongodb";

// GET /api/documents?repoKey=owner/repo&path=src/file.js
// Returns saved documentation for a specific file (or empty document if none).
export async function getDocument(req, res) {
  const { repoKey, path } = req.query;
  if (!repoKey || !path) return res.status(400).json({ error: "repoKey and path required" });

  const doc = await state.documents.findOne(
    { repoKey, path },
    { projection: { _id: 1, repoKey: 1, path: 1, branch: 1, content: 1, body: 1, anchors: 1, version: 1, updatedAt: 1 } }
  );

  if (!doc) {
    return res.json({ 
      repoKey, 
      path, 
      body: "", 
      content: null, 
      anchors: [], 
      version: 0,
      updatedAt: null 
    });
  }

  return res.json(doc);
}

// GET /api/documents/list?repoKey=owner/repo
// Returns all documents for a repository
export async function listDocuments(req, res) {
  const { repoKey } = req.query;
  if (!repoKey) return res.status(400).json({ error: "repoKey required" });

  const documents = await state.documents
    .find({ repoKey })
    .project({ _id: 1, repoKey: 1, path: 1, branch: 1, anchors: 1, updatedAt: 1, createdAt: 1 })
    .sort({ updatedAt: -1 })
    .toArray();

  return res.json({ documents });
}

// POST /api/documents
// Body: { repoKey, path, body?, content?, branch? }
// Creates a new document for a specific file.
export async function createDocument(req, res) {
  const { repoKey, path, body, content, branch } = req.body || {};
  if (!repoKey || !path) return res.status(400).json({ error: "repoKey and path required" });

  // Check if document already exists
  const existing = await state.documents.findOne({ repoKey, path });
  if (existing) {
    return res.status(409).json({ error: "Document already exists", document: existing });
  }

  const now = new Date();
  const newDoc = {
    repoKey,
    path,
    branch: branch || "main",
    body: body || "",
    content: content || null,
    anchors: [],
    version: 0,
    createdAt: now,
    updatedAt: now
  };

  const result = await state.documents.insertOne(newDoc);
  newDoc._id = result.insertedId;

  return res.status(201).json({ ok: true, document: newDoc });
}

// PUT /api/documents
// Body: { repoKey, path, body?, content?, version? }
// Updates the documentation body or content for a specific file.
export async function upsertDoc(req, res) {
  const { repoKey, path, body, content, version } = req.body || {};
  if (!repoKey || !path) return res.status(400).json({ error: "repoKey and path required" });

  const now = new Date();
  const updateFields = { updatedAt: now };
  
  if (body !== undefined) updateFields.body = body;
  if (content !== undefined) updateFields.content = content;

  const { value } = await state.documents.findOneAndUpdate(
    { repoKey, path },
    { 
      $set: updateFields,
      $inc: { version: 1 },
      $setOnInsert: { branch: "main", anchors: [], createdAt: now }
    },
    { upsert: true, returnDocument: "after" }
  );

  return res.json({ ok: true, document: value });
}

// DELETE /api/documents?repoKey=owner/repo&path=src/file.js
// Deletes a document
export async function deleteDocument(req, res) {
  const { repoKey, path } = req.query;
  if (!repoKey || !path) return res.status(400).json({ error: "repoKey and path required" });

  const result = await state.documents.deleteOne({ repoKey, path });
  
  if (!result.deletedCount) {
    return res.status(404).json({ error: "Document not found" });
  }

  return res.json({ ok: true });
}

// POST /api/documents/anchors
// Body: { repoKey, path, startLine, endLine, text?, docSpan? }
// Adds an anchor to a document
export async function addAnchor(req, res) {
  const { repoKey, path, startLine, endLine, text, docSpan } = req.body || {};
  
  if (!repoKey || !path || startLine == null || endLine == null) {
    return res.status(400).json({ error: "repoKey, path, startLine, endLine are required" });
  }

  const s = Number(startLine);
  const e = Number(endLine);
  if (!Number.isInteger(s) || !Number.isInteger(e) || s < 1 || e < 1 || s > e) {
    return res.status(400).json({ error: "startLine and endLine must be positive integers with start <= end" });
  }

  const now = new Date();
  const newAnchor = {
    _id: new ObjectId(),
    startLine: s,
    endLine: e,
    text: text || "",
    docSpan: docSpan || null,
    createdAt: now,
    updatedAt: now
  };

  const { value } = await state.documents.findOneAndUpdate(
    { repoKey, path },
    { 
      $push: { anchors: newAnchor },
      $set: { updatedAt: now },
      $setOnInsert: { branch: "main", body: "", content: null, version: 0, createdAt: now }
    },
    { upsert: true, returnDocument: "after" }
  );

  return res.status(201).json({ ok: true, anchor: newAnchor, document: value });
}

// PUT /api/documents/anchors/:anchorId
// Body: { repoKey, path, startLine?, endLine?, text?, docSpan? }
// Updates an existing anchor
export async function updateAnchor(req, res) {
  const { anchorId } = req.params;
  const { repoKey, path, startLine, endLine, text, docSpan } = req.body || {};
  
  if (!repoKey || !path) {
    return res.status(400).json({ error: "repoKey and path are required" });
  }

  const now = new Date();
  const updateFields = { "anchors.$.updatedAt": now };
  
  if (startLine !== undefined) {
    const s = Number(startLine);
    if (!Number.isInteger(s) || s < 1) {
      return res.status(400).json({ error: "startLine must be a positive integer" });
    }
    updateFields["anchors.$.startLine"] = s;
  }
  
  if (endLine !== undefined) {
    const e = Number(endLine);
    if (!Number.isInteger(e) || e < 1) {
      return res.status(400).json({ error: "endLine must be a positive integer" });
    }
    updateFields["anchors.$.endLine"] = e;
  }
  
  if (text !== undefined) updateFields["anchors.$.text"] = text;
  if (docSpan !== undefined) updateFields["anchors.$.docSpan"] = docSpan;

  const { value } = await state.documents.findOneAndUpdate(
    { repoKey, path, "anchors._id": new ObjectId(anchorId) },
    { $set: updateFields },
    { returnDocument: "after" }
  );

  if (!value) {
    return res.status(404).json({ error: "Document or anchor not found" });
  }

  const updatedAnchor = value.anchors.find(a => a._id.toString() === anchorId);
  return res.json({ ok: true, anchor: updatedAnchor, document: value });
}

// DELETE /api/documents/anchors/:anchorId?repoKey=owner/repo&path=src/file.js
// Removes an anchor from a document
export async function deleteAnchor(req, res) {
  const { anchorId } = req.params;
  const { repoKey, path } = req.query;
  
  if (!repoKey || !path) {
    return res.status(400).json({ error: "repoKey and path are required" });
  }

  const { value } = await state.documents.findOneAndUpdate(
    { repoKey, path },
    { 
      $pull: { anchors: { _id: new ObjectId(anchorId) } },
      $set: { updatedAt: new Date() }
    },
    { returnDocument: "after" }
  );

  if (!value) {
    return res.status(404).json({ error: "Document not found" });
  }

  return res.json({ ok: true, document: value });
}
