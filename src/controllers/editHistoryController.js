// Purpose: Track and manage edit history for documents

import { state } from "../models/db.js";
import { ObjectId } from "mongodb";

// Create a new edit history entry
export async function createEditHistory(req, res) {
  try {
    const { userId, documentId, repoKey, path, action, changes, previousContent, newContent } = req.body;

    if (!userId || !documentId || !repoKey || !path) {
      return res.status(400).json({ 
        error: "userId, documentId, repoKey, and path are required" 
      });
    }

    const editEntry = {
      userId,
      documentId,
      repoKey,
      path,
      action: action || "edit",
      changes: changes || "Document updated",
      previousContent: previousContent || null,
      newContent: newContent || null,
      timestamp: new Date(),
      createdAt: new Date()
    };

    const result = await state.editHistories.insertOne(editEntry);
    
    return res.status(201).json({ 
      success: true, 
      _id: result.insertedId,
      ...editEntry 
    });
  } catch (error) {
    console.error("Error creating edit history:", error);
    return res.status(500).json({ error: "Failed to create edit history entry" });
  }
}

// Get all edit histories (with pagination)
export async function getAllEditHistories(req, res) {
  try {
    const limit = parseInt(req.query.limit || "50", 10);
    const skip = parseInt(req.query.skip || "0", 10);

    const histories = await state.editHistories
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    return res.json(histories);
  } catch (error) {
    console.error("Error fetching edit histories:", error);
    return res.status(500).json({ error: "Failed to fetch edit histories" });
  }
}

// Get edit histories by user ID
export async function getEditHistoriesByUser(req, res) {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit || "100", 10);
    const skip = parseInt(req.query.skip || "0", 10);

    const histories = await state.editHistories
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    return res.json(histories);
  } catch (error) {
    console.error("Error fetching user edit histories:", error);
    return res.status(500).json({ error: "Failed to fetch user edit histories" });
  }
}

// Get edit histories by document/project ID
export async function getEditHistoriesByDocument(req, res) {
  try {
    const { documentId } = req.params;
    const limit = parseInt(req.query.limit || "100", 10);
    const skip = parseInt(req.query.skip || "0", 10);

    const histories = await state.editHistories
      .find({ documentId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    return res.json(histories);
  } catch (error) {
    console.error("Error fetching document edit histories:", error);
    return res.status(500).json({ error: "Failed to fetch document edit histories" });
  }
}

// Search history by keyword
export async function searchEditHistoryByKeyword(req, res) {
  try {
    const { keyword } = req.params;
    const limit = parseInt(req.query.limit || "50", 10);

    const histories = await state.editHistories
      .find({
        $or: [
          { path: { $regex: keyword, $options: 'i' } },
          { changes: { $regex: keyword, $options: 'i' } },
          { repoKey: { $regex: keyword, $options: 'i' } }
        ]
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return res.json(histories);
  } catch (error) {
    console.error("Error searching edit histories:", error);
    return res.status(500).json({ error: "Failed to search edit histories" });
  }
}

// Delete an edit history entry
export async function deleteEditHistory(req, res) {
  try {
    const { id } = req.params;

    const result = await state.editHistories.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Edit history not found" });
    }

    return res.json({ success: true, message: "Edit history deleted" });
  } catch (error) {
    console.error("Error deleting edit history:", error);
    return res.status(500).json({ error: "Failed to delete edit history" });
  }
}

// Update an edit history entry
export async function updateEditHistory(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.createdAt;
    delete updates.userId;
    delete updates.documentId;

    const result = await state.editHistories.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Edit history not found" });
    }

    return res.json({ success: true, message: "Edit history updated" });
  } catch (error) {
    console.error("Error updating edit history:", error);
    return res.status(500).json({ error: "Failed to update edit history" });
  }
}

// Export as an object for route compatibility
export const editHistoryController = {
  createEditHistory,
  getAllEditHistories,
  getEditHistoriesByUser,
  getEditHistoriesByDocument,
  searchEditHistoryByKeyword,
  deleteEditHistory,
  updateEditHistory
};
