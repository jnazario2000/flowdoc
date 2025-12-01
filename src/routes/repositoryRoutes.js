// Repository Routes
// API endpoints for repository management and access control

import { Router } from 'express';
import { repositoryController } from '../controllers/repositoryController.js';

const router = Router();

// Create a new repository
router.post('/repositories', repositoryController.createRepository);

// Get repository by key
router.get('/repositories/:repoKey', repositoryController.getRepository);

// Get all repositories accessible to a user
router.get('/repositories', repositoryController.getAccessibleRepositories);

// Check if user has access to a repository
router.get('/repositories/:repoKey/access', repositoryController.checkAccess);

// Update repository settings
router.put('/repositories/:repoKey', repositoryController.updateRepository);

// Remove a collaborator
router.delete('/repositories/:repoKey/collaborators', repositoryController.removeCollaborator);

// Documentation goals (todos)
router.get('/repositories/:repoKey/todos', repositoryController.getTodos);
router.put('/repositories/:repoKey/todos', repositoryController.saveTodos);

export default router;

