import { state } from '../models/db.js';
import { ObjectId } from 'mongodb';

async function getAllUsers() {
  return state.users.find({}).toArray();
}

async function getUserById(id) {
  return state.users.findOne({ _id: new ObjectId(id) });
}

async function createUser({ username, email, name }) {
  if (!username || !email) throw new Error('username and email are required');
  const now = new Date();
  const r = await state.users.insertOne({ username, email, name: name ?? '', createdAt: now, updatedAt: now });
  return r.insertedId;
}

async function updateUser(id, updates) {
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
  createUser,
  updateUser,
  deleteUser,
};
