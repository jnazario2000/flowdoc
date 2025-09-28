// Goal: Open ONE MongoDB connection and expose commonly used collections.
// You import { state, connectDB } wherever you need DB access.

import { MongoClient } from "mongodb";

const url    = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.DB_NAME   || "myDatabase";

// Create a single MongoDB client instance (don't create one per request).
const client = new MongoClient(url);

// 'state' holds the live db handle and the collections after connectDB() runs.
export const state = {
  db: null,        // the actual database handle
  documents: null, // collection for docs tied to repoKey+path (your FlowDoc prose)
  files: null,     // collection for raw file contents (cached from GitHub or seeded)
  anchors: null,   // collection for line-range anchors
  threads: null,   // collection for comment threads
};

// Call this ONCE during app startup (or lazily the first time you need it).
export async function connectDB() {
  // If already connected, just return the handle (idempotent).
  if (state.db) return state.db;

  // Open socket to Mongo and select the DB.
  await client.connect();
  const db = client.db(dbName);

  // Save the db + collections on the shared state object.
  state.db        = db;
  state.documents = db.collection("documents");
  state.files     = db.collection("files");
  state.anchors   = db.collection("anchors");
  state.threads   = db.collection("threads");

  // Ensure (repoKey, path) is unique for documents.
  // partialFilterExpression means the index only applies when fields exist.
 
  await state.documents.createIndex(
    { repoKey: 1, path: 1 },
    {
      unique: true,
      partialFilterExpression: {
        repoKey: { $exists: true },
        path:    { $exists: true }
        // If you want to be stricter, consider also checking types:
        // repoKey: { $type: "string" }, path: { $type: "string" }
      }
    }
  );

  // Speed up anchor queries and prevent duplicates on the same range.
  await state.anchors.createIndex(
    { repoKey: 1, path: 1, startLine: 1, endLine: 1 },
    {
      partialFilterExpression: {
        repoKey: { $exists: true },
        path:    { $exists: true }
      }
    }
  );

  console.log(`Mongo connected → db: ${dbName}`);
  return db;
}
