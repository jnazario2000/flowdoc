// Purpose: Handle authentication routes (signin, signup)

import { userService } from "../services/userService.js";

async function signup(req, res) {
  const { username, email, name, password } = req.body || {};
  
  try {
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: "Username, email, and password are required" 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate password strength (at least 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ 
        message: "Password must be at least 6 characters long" 
      });
    }

    // Create user
    const userId = await userService.createUser({ username, email, name, password });
    
    // Get user without password
    const user = await userService.getUserById(userId);
    
    return res.status(201).json({ 
      message: "Account created successfully", 
      user 
    });
  } catch (error) {
    // Handle specific errors
    if (error.message === 'Email already registered') {
      return res.status(409).json({ message: error.message });
    }
    if (error.message === 'Username already taken') {
      return res.status(409).json({ message: error.message });
    }
    
    return res.status(400).json({ message: error.message });
  }
}

async function signin(req, res) {
  const { identifier, password } = req.body || {};
  
  try {
    // Validate input
    if (!identifier || !password) {
      return res.status(400).json({ 
        message: "Email/username and password are required" 
      });
    }

    // Validate credentials
    const user = await userService.validateCredentials(identifier, password);
    
    if (!user) {
      return res.status(401).json({ 
        message: "Invalid credentials" 
      });
    }

    // In a production app, you'd generate a JWT token here
    // For now, we'll just return the user data
    return res.json({ 
      message: "Sign in successful", 
      user 
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getCurrentUser(req, res) {
  // This would typically use the auth token to get the current user
  // For now, it's a placeholder
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }

    const user = await userService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export const authController = {
  signup,
  signin,
  getCurrentUser,
};

