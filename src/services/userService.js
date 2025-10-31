import { state } from '../models/db.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

async function getAllUsers() {
  // Don't return passwords
  return state.users.find({}).project({ password: 0 }).toArray();
}

async function getUserById(id) {
  return state.users.findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } });
}

async function getUserByEmail(email) {
  return state.users.findOne({ email });
}

async function getUserByUsername(username) {
  return state.users.findOne({ username });
}

async function createUser({ username, email, name, password }) {
  if (!username || !email || !password) {
    throw new Error('username, email, and password are required');
  }

  // Check if user already exists
  const existingEmail = await getUserByEmail(email);
  if (existingEmail) {
    throw new Error('Email already registered');
  }

  const existingUsername = await getUserByUsername(username);
  if (existingUsername) {
    throw new Error('Username already taken');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const now = new Date();
  
  try {
    const r = await state.users.insertOne({ 
      username, 
      email, 
      name: name ?? '', 
      password: hashedPassword,
      createdAt: now, 
      updatedAt: now 
    });
    return r.insertedId;
  } catch (error) {
    // Handle duplicate key error (MongoDB error code 11000)
    if (error.code === 11000) {
      // Check which field is duplicated
      if (error.keyPattern?.username) {
        throw new Error('Username already taken');
      } else if (error.keyPattern?.email) {
        throw new Error('Email already registered');
      } else {
        throw new Error('Username or email already exists');
      }
    }
    throw error;
  }
}

async function validateCredentials(identifier, password) {
  // identifier can be email or username
  let user = await getUserByEmail(identifier);
  if (!user) {
    user = await getUserByUsername(identifier);
  }

  if (!user) {
    return null; // User not found
  }

  // Compare password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return null; // Invalid password
  }

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

async function updateUser(id, updates) {
  // If updating password, hash it
  if (updates.password) {
    updates.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
  }

  const $set = { ...updates, updatedAt: new Date() };
  const r = await state.users.updateOne({ _id: new ObjectId(id) }, { $set });
  return r.matchedCount > 0;
}

async function deleteUser(id) {
  const r = await state.users.deleteOne({ _id: new ObjectId(id) });
  return r.deletedCount > 0;
}

export const userService = {
  getAllUsers,
  getUserById,
  getUserByEmail,
  getUserByUsername,
  createUser,
  validateCredentials,
  updateUser,
  deleteUser,
};
