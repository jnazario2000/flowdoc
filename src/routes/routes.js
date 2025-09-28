import express from "express";
import Document from "./models/Document.js";
import Thread from "./models/Thread.js";
const r = express.Router();

// documents
r.get("/api/documents/:id", async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.json({ _id: req.params.id, content: { type:"doc", content:[] }, version: 0 });
  res.json(doc);
});
r.patch("/api/documents/:id", async (req, res) => {
  const { content, baseVersion } = req.body;
  const doc = await Document.findById(req.params.id);
  if (doc && baseVersion !== doc.version) return res.status(409).json({ error: "version_conflict" });
  const updated = await Document.findByIdAndUpdate(
    req.params.id,
    { _id: req.params.id, content, $inc: { version: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json(updated);
});

// threads
r.get("/api/documents/:id/threads", async (req, res) => {
  const threads = await Thread.find({ docId: req.params.id }).sort({ updatedAt: -1 });
  res.json(threads);
});
r.post("/api/documents/:id/threads", async (req, res) => {
  const { blockId, from, to, body, authorId } = req.body;
  const t = await Thread.create({
    docId: req.params.id, blockId, from, to,
    comments: [{ body, authorId }]
  });
  res.status(201).json(t);
});
r.post("/api/threads/:threadId/replies", async (req, res) => {
  const { body, authorId } = req.body;
  const t = await Thread.findByIdAndUpdate(
    req.params.threadId,
    { $push: { comments: { body, authorId } } },
    { new: true }
  );
  res.json(t);
});
r.patch("/api/threads/:threadId", async (req, res) => {
  const t = await Thread.findByIdAndUpdate(req.params.threadId, { resolved: req.body.resolved }, { new: true });
  res.json(t);
});

export default r;
