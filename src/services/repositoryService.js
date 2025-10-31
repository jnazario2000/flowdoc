// Repository Service
// Handles repository creation, access control, and collaborator management

import { state, connectDB } from '../models/db.js';
import { Repository } from '../models/Repository.js';
import { ObjectId } from 'mongodb';

export const repositoryService = {
  // Create a new repository
  async createRepository(data) {
    await connectDB();
    
    const repository = new Repository({
      repoKey: data.repoKey,
      name: data.name || data.repoKey,
      description: data.description || '',
      githubUrl: data.githubUrl || '',
      isPrivate: typeof data.isPrivate === 'boolean' ? data.isPrivate : false,
      ownerId: data.ownerId,
      ownerUsername: data.ownerUsername,
      collaborators: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await state.repositories.insertOne(repository.toJSON());
    return result.insertedId;
  },

  // Get repository by repoKey
  async getRepositoryByKey(repoKey) {
    await connectDB();
    const doc = await state.repositories.findOne({ repoKey });
    return doc ? new Repository(doc) : null;
  },

  // Get repository by ID
  async getRepositoryById(id) {
    await connectDB();
    const doc = await state.repositories.findOne({ _id: new ObjectId(id) });
    return doc ? new Repository(doc) : null;
  },

  // Get all repositories owned by a user
  async getRepositoriesByOwner(userId) {
    await connectDB();
    const docs = await state.repositories.find({ ownerId: userId }).toArray();
    return docs.map(doc => new Repository(doc));
  },

  // Get all repositories where user is a collaborator
  async getRepositoriesByCollaborator(userId) {
    await connectDB();
    const docs = await state.repositories.find({
      'collaborators.userId': userId
    }).toArray();
    return docs.map(doc => new Repository(doc));
  },

  // Get all repositories accessible to a user (public + owned + collaborating)
  async getAccessibleRepositories(userId) {
    await connectDB();
    const docs = await state.repositories.find({
      $or: [
        { isPrivate: false }, // Public repositories
        { ownerId: userId }, // Owned repositories
        { 'collaborators.userId': userId } // Collaborating repositories
      ]
    }).toArray();
    return docs.map(doc => new Repository(doc));
  },

  // Check if user has access to a repository
  async checkAccess(repoKey, userId) {
    const repository = await this.getRepositoryByKey(repoKey);
    
    // If repository doesn't exist in database, allow access (legacy support)
    if (!repository) return { hasAccess: true, isOwner: false, isPublic: true };
    
    const hasAccess = repository.hasAccess(userId);
    const isOwner = repository.isOwner(userId);
    const isPublic = !repository.isPrivate;
    
    return { hasAccess, isOwner, isPublic, repository };
  },

  // Add a collaborator to a repository
  async addCollaborator(repoKey, userId, username) {
    await connectDB();
    const repository = await this.getRepositoryByKey(repoKey);
    
    if (!repository) {
      throw new Error('Repository not found');
    }

    repository.addCollaborator(userId, username);
    
    await state.repositories.updateOne(
      { repoKey },
      { 
        $set: { 
          collaborators: repository.collaborators,
          updatedAt: new Date()
        }
      }
    );

    return repository;
  },

  // Remove a collaborator from a repository
  async removeCollaborator(repoKey, userId) {
    await connectDB();
    const repository = await this.getRepositoryByKey(repoKey);
    
    if (!repository) {
      throw new Error('Repository not found');
    }

    repository.removeCollaborator(userId);
    
    await state.repositories.updateOne(
      { repoKey },
      { 
        $set: { 
          collaborators: repository.collaborators,
          updatedAt: new Date()
        }
      }
    );

    return repository;
  },

  // Update repository settings
  async updateRepository(repoKey, updates) {
    await connectDB();
    
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    await state.repositories.updateOne(
      { repoKey },
      { $set: updateData }
    );

    return await this.getRepositoryByKey(repoKey);
  },

  // Delete a repository
  async deleteRepository(repoKey) {
    await connectDB();
    const result = await state.repositories.deleteOne({ repoKey });
    return result.deletedCount > 0;
  }
};

