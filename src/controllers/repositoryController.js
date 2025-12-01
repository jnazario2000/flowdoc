// Repository Controller
// Handles HTTP requests for repository management and access control

import { repositoryService } from '../services/repositoryService.js';
import { userService } from '../services/userService.js';

export const repositoryController = {
  // Create a new repository
  async createRepository(req, res) {
    try {
      const { repoKey, name, description, githubUrl, isPrivate, ownerId, ownerUsername } = req.body;

      if (!repoKey || !ownerId || !ownerUsername) {
        return res.status(400).json({
          message: 'Repository key, owner ID, and owner username are required'
        });
      }

      // Check if repository already exists
      const existing = await repositoryService.getRepositoryByKey(repoKey);
      if (existing) {
        return res.status(409).json({
          message: 'Repository already exists'
        });
      }

      const repositoryId = await repositoryService.createRepository({
        repoKey,
        name: name || repoKey,
        description,
        githubUrl,
        isPrivate: typeof isPrivate === 'boolean' ? isPrivate : false,
        ownerId,
        ownerUsername
      });

      const repository = await repositoryService.getRepositoryById(repositoryId);

      return res.status(201).json({
        message: 'Repository created successfully',
        repository: repository.toJSON()
      });
    } catch (error) {
      console.error('Error creating repository:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // Get repository by key
  async getRepository(req, res) {
    try {
      const { repoKey } = req.params;
      const repository = await repositoryService.getRepositoryByKey(repoKey);

      if (!repository) {
        return res.status(404).json({ message: 'Repository not found' });
      }

      return res.json({ repository: repository.toJSON() });
    } catch (error) {
      console.error('Error getting repository:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // Get all repositories accessible to a user
  async getAccessibleRepositories(req, res) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ message: 'User ID required' });
      }

      const repositories = await repositoryService.getAccessibleRepositories(userId);

      return res.json({
        repositories: repositories.map(r => r.toJSON())
      });
    } catch (error) {
      console.error('Error getting accessible repositories:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // Check if user has access to a repository
  async checkAccess(req, res) {
    try {
      const { repoKey } = req.params;
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ message: 'User ID required' });
      }

      const accessInfo = await repositoryService.checkAccess(repoKey, userId);

      return res.json(accessInfo);
    } catch (error) {
      console.error('Error checking repository access:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // Update repository settings
  async updateRepository(req, res) {
    try {
      const { repoKey } = req.params;
      const { userId, ...updates } = req.body;

      // Check if user is owner
      const repository = await repositoryService.getRepositoryByKey(repoKey);
      if (!repository) {
        return res.status(404).json({ message: 'Repository not found' });
      }

      // Only the owner can update repository settings
      if (!repository.isOwner(userId)) {
        return res.status(403).json({ message: 'Only the owner can update repository settings' });
      }

      // Don't allow changing the owner
      if (updates.ownerId && updates.ownerId !== repository.ownerId) {
        return res.status(403).json({ message: 'Cannot transfer repository ownership' });
      }

      const updatedRepository = await repositoryService.updateRepository(repoKey, updates);

      return res.json({
        message: 'Repository updated successfully',
        repository: updatedRepository.toJSON()
      });
    } catch (error) {
      console.error('Error updating repository:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // Remove a collaborator
  async removeCollaborator(req, res) {
    try {
      const { repoKey } = req.params;
      const { userId, collaboratorId } = req.body;

      const repository = await repositoryService.getRepositoryByKey(repoKey);
      if (!repository) {
        return res.status(404).json({ message: 'Repository not found' });
      }

      // Only owner can remove collaborators
      if (!repository.isOwner(userId)) {
        return res.status(403).json({ message: 'Only the owner can remove collaborators' });
      }

      const updatedRepository = await repositoryService.removeCollaborator(repoKey, collaboratorId);

      return res.json({
        message: 'Collaborator removed successfully',
        repository: updatedRepository.toJSON()
      });
    } catch (error) {
      console.error('Error removing collaborator:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // Get documentation goals (todos) for a repository
  async getTodos(req, res) {
    try {
      const { repoKey } = req.params;
      const todos = await repositoryService.getTodos(repoKey);
      
      return res.json({ todos });
    } catch (error) {
      console.error('Error getting todos:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // Save documentation goals (todos) for a repository
  async saveTodos(req, res) {
    try {
      const { repoKey } = req.params;
      const { todos } = req.body;

      if (!Array.isArray(todos)) {
        return res.status(400).json({ message: 'Todos must be an array' });
      }

      await repositoryService.saveTodos(repoKey, todos);

      return res.json({
        message: 'Documentation goals saved successfully',
        todos
      });
    } catch (error) {
      console.error('Error saving todos:', error);
      return res.status(500).json({ message: error.message });
    }
  }
};

