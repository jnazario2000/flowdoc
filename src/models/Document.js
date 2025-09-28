// Define a Mongoose model for a rich-text document (e.g., TipTap content) with optimistic versioning.

import mongoose from "mongoose";

// Schema = structure + constraints for the documents collection (Mongoose-managed).
const DocumentSchema = new mongoose.Schema(
  {
    _id: String,           
    content: Object,        
    version: {             
      type: Number,
      default: 0
    }
  },
  { timestamps: true }      // Automatically adds createdAt and updatedAt fields.
);

// Export a Mongoose Model named "Document" (maps to "documents" collection by default).
export default mongoose.model("Document", DocumentSchema);
