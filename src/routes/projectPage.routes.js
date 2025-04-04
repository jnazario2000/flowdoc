// This allows projectPageController and index.js to communicate
import express from 'express';
import { projectPageController } from '../controllers/projectPageController.js';

const router = express.Router();

// Routes
router.get('/project-pages', projectPageController.getAllProjectPages);              // Get all project pages
router.post('/project-pages', projectPageController.createProjectPage);             // Create a new project page
router.get('/project-pages/:id', projectPageController.getProjectPageById);        // Get project page by ID
router.post('/project-pages/:id/collaborators', projectPageController.addCollaborator); // Add a collaborator to a project page

export default router;