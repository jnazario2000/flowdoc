// handles HTTP requests and most logic used for website front end
import { userService } from '../services/userService.js';

export const userController = {
    // Handle creating a new user
    async createUser(req, res) {
        const { username, email, name } = req.body;
        try {
            const userId = await userService.createUser({ username, email, name });
            res.status(201).json({ message: 'User created', userId });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Handle fetching all users
    async getAllUsers(req, res) {
        try {
            const users = await userService.getAllUsers();
            res.json(users);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Handle fetching a user by ID
    async getUserById(req, res) {
        const { id } = req.params;
        try {
            const user = await userService.getUserById(id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Handle updating a user's details
    async updateUser(req, res) {
        const { id } = req.params;
        const updates = req.body;
        try {
            const success = await userService.updateUser(id, updates);
            if (success) {
                res.json({ message: 'User updated' });
            } else {
                res.status(404).json({ message: 'User not found or no changes made' });
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Handle deleting a user
    async deleteUser(req, res) {
        const { id } = req.params;
        try {
            const success = await userService.deleteUser(id);
            if (success) {
                res.json({ message: 'User deleted' });
            } else {
                res.status(404).json({ message: 'User not found' });
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};