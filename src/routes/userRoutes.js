// this allows userController and index.js to communicate
import express from 'express';
import { userController } from '../controllers/userController.js';

const router = express.Router();

// Routes
router.get('/users', userController.getAllUsers);            // Get all users
router.post('/users', userController.createUser);            // Create a new user
router.get('/users/:id', userController.getUserById);        // Get user by ID
router.put('/users/:id', userController.updateUser);         // Update user details
router.delete('/users/:id', userController.deleteUser);     // Delete user

export default router;