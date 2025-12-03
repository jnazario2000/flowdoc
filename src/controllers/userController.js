// Purpose: Thin controller that defers to userService for actual DB work.

import { userService } from "../services/userService.js";

async function createUser(req, res) {
  const { username, email, name } = req.body || {};
  try {
    const userId = await userService.createUser({ username, email, name });
    return res.status(201).json({ message: "User created", userId });
  } catch (error) {
    // 400 because userService likely throws validation messages
    return res.status(400).json({ message: error.message });
  }
}

async function getAllUsers(_req, res) {
  try {
    const users = await userService.getAllUsers();
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getUserById(req, res) {
  const { id } = req.params;
  try {
    const user = await userService.getUserById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const updates = req.body || {};
  try {
    const success = await userService.updateUser(id, updates);
    if (!success) return res.status(404).json({ message: "User not found or no changes made" });
    
    // Return the updated user object so frontend can update localStorage
    const updatedUser = await userService.getUserById(id);
    return res.json(updatedUser);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function deleteUser(req, res) {
  const { id } = req.params;
  try {
    const success = await userService.deleteUser(id);
    if (!success) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "User deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export const userController = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
