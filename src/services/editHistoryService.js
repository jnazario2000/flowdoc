import { state } from "../models/db.js";
import { ObjectId } from "mongodb";

export async function recordEdit({ docId, authorId, content, note }) {
  const now = new Date();
  const payload = {
    docId: new ObjectId(docId),
    authorId: new ObjectId(authorId),
    content,
    note: note || null,
    createdAt: now,
  };

  const res = await state.editHistories.insertOne(payload);

  // keep the document head in sync
  await state.documents.updateOne(
    { _id: new ObjectId(docId) },
    { $set: { content, updatedBy: new ObjectId(authorId), updatedAt: now } }
  );

  return { _id: res.insertedId, createdAt: now };
}

export async function listEdits({ docId, limit = 20, skip = 0 }) {
  return state.editHistories
    .find({ docId: new ObjectId(docId) })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Math.min(limit, 100))
    .toArray();
}

export async function getEditById(editId) {
  return state.editHistories.findOne({ _id: new ObjectId(editId) });
}
