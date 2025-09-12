async function createProjectPage(data) {
   const { title, description, ownerId, files} = data;
 
   const result = await projectPagesCollection.insertOne({
     title,
     description,
     ownerId,
     createdAt: new Date(),
     files: files || [],
     collaborators: [],
   });
 
   return result;
 }

 import { projectPageService } from '../services/projectPageService.js';
 
 export const projectPageController = {
     // Create a new Project Page
     async createProjectPage(req, res) {

         const { title, description, ownerId, files } = req.body;
         try {
             const projectId = await projectPageService.createProjectPage({ title, description, ownerId, files});
             res.status(201).json({ message: 'Project Page created', projectId });
         } catch (error) {
             res.status(500).json({ message: error.message });
         }
     },
 
     // Get one Project Page by ID
     async getProjectPageById(req, res) {
         const { id } = req.params;
         try {
             const project = await projectPageService.getProjectPageById(id);
             if (!project) {
                 return res.status(404).json({ message: 'Project Page not found' });
             }
             res.json(project);
         } catch (error) {
             res.status(500).json({ message: error.message });
         }
     },
 
     // Optional: Get all project pages
     async getAllProjectPages(req, res) {
         try {
             const projects = await projectPageService.getAllProjectPages();
             res.json(projects);
         } catch (error) {
             res.status(500).json({ message: error.message });
         }
     },
 
     // Optional: Add collaborator
     async addCollaborator(req, res) {
         const { id } = req.params; // projectPage ID
         const { collaboratorId } = req.body;
         try {
             const updated = await projectPageService.addCollaborator(id, collaboratorId);
             if (!updated) {
                 return res.status(404).json({ message: 'Project Page not found' });
             }
             res.json({ message: 'Collaborator added' });
         } catch (error) {
             res.status(500).json({ message: error.message });
         }
     },
 
     // You could also add similar methods for files and todos
 };