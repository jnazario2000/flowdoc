import { editHistoriesCollection } from '../models/db.js';
import { ObjectId } from 'mongodb';

export const editHistoryService = {
  async createEditHistory({ userId, documentId, changes, timestamp }) {
    try {
      const result = await editHistoriesCollection.insertOne({
        userId: new ObjectId(userId),
        documentId,
        changes,
        timestamp: timestamp || new Date(),
      });
      return result.insertedId;
    } catch (error) {
      throw new Error('Error inserting edit history');
    }
  },

  async getAllEditHistories() {
    try {
      return await editHistoriesCollection.find().toArray();
    } catch (error) {
      throw new Error('Error fetching all edit histories');
    }
  },

  async getEditHistoriesByUser(userId) {
    try {
      return await editHistoriesCollection.find({
        userId: new ObjectId(userId)
      }).toArray();
    } catch (error) {
      throw new Error('Error fetching edit histories by user');
    }
  },

  async getEditHistoriesByDocument(documentId) {
    try {
      return await editHistoriesCollection.find({
        documentId: documentId
      }).toArray();
    } catch (error) {
      throw new Error('Error fetching edit histories by document');
    }
  },

  async searchByKeyword(keyword) {
    try {
      return await editHistoriesCollection.find({
        changes: { $regex: keyword, $options: 'i' }
      }).toArray();
    } catch (error) {
      throw new Error('Error searching edit histories');
    }
  },

  async deleteEditHistory(id) {
    try {
      const result = await editHistoriesCollection.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      throw new Error('Error deleting edit history');
    }
  },

  async updateEditHistory(id, updates) {
    try {
      const result = await editHistoriesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      throw new Error('Error updating edit history');
    }
  }
};
