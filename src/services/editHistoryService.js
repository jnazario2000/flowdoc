import { editHistoriesCollection } from '../models/db.js';
import { ObjectId } from 'mongodb'; // Needed for userId

export const editHistoryService = {
    // Create a new edit history record
    async createEditHistory({ userId, documentId, changes, timestamp }) {
        try {
            const result = await editHistoriesCollection.insertOne({
                userId: new ObjectId(userId), // Link to User
                documentId,
                changes,    // Could be a description or object of changes
                timestamp: timestamp || new Date(), // Default to now if not provided
            });
            return result.insertedId;
        } catch (error) {
            throw new Error('Error inserting edit history');
        }
    },

    // Get edit histories for a specific user
    async getEditHistoriesByUser(userId) {
        try {
            const histories = await editHistoriesCollection.find({
                userId: new ObjectId(userId)
            }).toArray();
            return histories;
        } catch (error) {
            throw new Error('Error fetching edit histories');
        }
    },

    // Optional: Get all edit histories
    async getAllEditHistories() {
        try {
            return await editHistoriesCollection.find().toArray();
        } catch (error) {
            throw new Error('Error fetching all edit histories');
        }
    },
};