// Define a Mongoose model for per-block comment threads (like Google Docs comments on a paragraph/range).

import mongoose from "mongoose";

// Each comment inside a thread
const CommentSchema = new mongoose.Schema({
  authorId: String,                  // Who wrote the comment (user id)
  body: String,                      // Comment text
  ts: { type: Date, default: Date.now } // Timestamp; you also get createdAt from timestamps option below if needed
});

// A thread groups comments on a document block or text range
const ThreadSchema = new mongoose.Schema(
  {
    docId: String,       // Which document this thread belongs to
    blockId: String,     // a specific block/element id (e.g., "p_abc123")
    from: Number,        // start index in text (if using ranges)
    to: Number,          // end index in text (if using ranges)
    comments: [CommentSchema],     // Array of comments
    resolved: { type: Boolean, default: false } // Mark thread as resolved
  },
  { timestamps: true }   // Adds createdAt and updatedAt to the thread
);

// Export the Mongoose Model; collection will be "threads" by default.
export default mongoose.model("Thread", ThreadSchema);
