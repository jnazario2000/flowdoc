// Define a Mongoose model for a rich-text document (e.g., TipTap content) with optimistic versioning.
// Documents can contain anchors (highlighted line ranges with documentation).

import mongoose from "mongoose";

// Schema for anchors within a document
const AnchorSchema = new mongoose.Schema({
  startLine: { type: Number, required: true },
  endLine: { type: Number, required: true },
  text: { type: String, default: "" },
  docSpan: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

// Schema = structure + constraints for the documents collection (Mongoose-managed).
const DocumentSchema = new mongoose.Schema(
  {
    _id: String,           
    repoKey: String,        // e.g., "owner/repo"
    path: String,           // file path in the repo
    branch: { type: String, default: "main" },
    content: Object,        // TipTap JSON content
    body: String,           // Plain text documentation body
    anchors: [AnchorSchema], // Array of anchors for this document
    version: {             
      type: Number,
      default: 0
    }
  },
  { timestamps: true }      // Automatically adds createdAt and updatedAt fields.
);

// Export a Mongoose Model named "Document" (maps to "documents" collection by default).
export default mongoose.model("Document", DocumentSchema);
