// Purpose: CRUD-ish endpoints for "Project Pages" (title, description, files list, collaborators).

import { projectPageService } from "../services/projectPageService.js";

// Create a new Project Page
async function createProjectPage(req, res) {
  const { title, description, ownerId, githubUrl, token, files } = req.body || {};
  try {
    if (!title || !ownerId) return res.status(400).json({ message: "title and ownerId are required" });
    const projectId = await projectPageService.createProjectPage({ title, description, ownerId, githubUrl, token,
      files });
    return res.status(201).json({ message: "Project Page created", projectId });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Get one Project Page by ID
async function getProjectPageById(req, res) {
  const { id } = req.params;
  try {
    const project = await projectPageService.getProjectPageById(id);
    if (!project) return res.status(404).json({ message: "Project Page not found" });
    return res.json(project);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Get all Project Pages
async function getAllProjectPages(_req, res) {
  try {
    const projects = await projectPageService.getAllProjectPages();
    return res.json(projects);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Add a collaborator to a project
async function addCollaborator(req, res) {
  const { id } = req.params;
  const { collaboratorId } = req.body || {};
  try {
    if (!collaboratorId) return res.status(400).json({ message: "collaboratorId required" });
    const updated = await projectPageService.addCollaborator(id, collaboratorId);
    if (!updated) return res.status(404).json({ message: "Project Page not found" });
    return res.json({ message: "Collaborator added" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export const projectPageController = {
  createProjectPage,
  getProjectPageById,
  getAllProjectPages,
  addCollaborator,
};
