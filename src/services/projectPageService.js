import { state, connectDB } from '../models/db.js';
import { ObjectId } from 'mongodb';


function getCollection() {
  if (!state.projectPagesCollection) {
    throw new Error('DB not initialized. Did you forget to call connectDB()?');
  }
  return state.projectPagesCollection;
}


export const projectPageService = {
  async createProjectPage({ title, description, githubUrl, token, ownerId }) {
  await connectDB();
  const collection = getCollection();

  try {
    const result = await collection.insertOne({
      title,
      description,
      githubUrl,
      token,
      ownerId: new ObjectId(ownerId),
      createdAt: new Date(),
      files: [],
      todos: [],
      collaborators: []
    });
    return result.insertedId;
    } catch (err) {
    console.error("Failed to insert project:", err.message);
    throw err;
    }
  },


  async getProjectPageById(id) {
    await connectDB();
    const collection = getCollection();

    return await collection.findOne({ _id: new ObjectId(id) });
  },

  async getAllProjectPages() {
    await connectDB();
    const collection = getCollection();

    return await collection.find({}).toArray();
  },

  async addCollaborator(projectId, collaboratorId) {
    await connectDB();
    const collection = getCollection();

    const result = await collection.updateOne(
      { _id: new ObjectId(projectId) },
      { $addToSet: { collaborators: new ObjectId(collaboratorId) } }
    );

    return result.modifiedCount > 0;
  },

  async getProjectPageByRepoKey(repoKey) {
    await connectDB();
    const collection = getCollection();

    // Extract owner/repo from githubUrl to match repoKey
    const projects = await collection.find({}).toArray();
    
    for (const project of projects) {
      if (project.githubUrl) {
        const match = project.githubUrl.match(/github\.com\/([^/]+)\/([^/?#]+)(?:\.git)?/i);
        if (match) {
          const projectRepoKey = `${match[1]}/${match[2]}`;
          if (projectRepoKey === repoKey) {
            return project;
          }
        }
      }
    }
    
    return null;
  }
};
