// this should handle interactions with the database and data processing
import { usersCollection } from '../models/userModel.js';

export const userService = {
    // Create a new user
    async createUser({ username, email, name }) {
        try {
            // Create a new user document
            const createdAt = new Date();  // Get current date and time
            const result = await usersCollection.insertOne({
                username,
                email,
                name,
                created_at: createdAt
            });
            return result.insertedId; // Return the user ID
        } catch (error) {
            throw new Error('Error inserting new user');
        }
    },

    // Get all users
    async getAllUsers() {
        try {
            const users = await usersCollection.find().toArray();
            return users;
        } catch (error) {
            throw new Error('Error fetching users from database');
        }
    },

    // Get a user by ID
    async getUserById(userId) {
        try {
            const user = await usersCollection.findOne({ _id: userId });
            return user;
        } catch (error) {
            throw new Error('Error finding user');
        }
    },

    // Update user information
    async updateUser(userId, updates) {
        try {
            const result = await usersCollection.updateOne(
                { _id: userId },
                { $set: updates }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            throw new Error('Error updating user');
        }
    },

    // Delete a user by ID
    async deleteUser(userId) {
        try {
            const result = await usersCollection.deleteOne({ _id: userId });
            return result.deletedCount > 0;
        } catch (error) {
            throw new Error('Error deleting user');
        }
    }
};