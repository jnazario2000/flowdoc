import { projectPagesCollection } from '../models/db.js';
import { ObjectId } from 'mongodb';

export const projectPageService = {
    async createProjectPage({ title, description, ownerId }) {
        const result = await projectPagesCollection.insertOne({
            title,
            description,
            ownerId: new ObjectId(ownerId),
            createdAt: new Date(),
            files: [],
            todos: [],
            collaborators: []
        });
        return result.insertedId;
    },

    async getProjectPageById(id) {
        return await projectPagesCollection.findOne({ _id: new ObjectId(id) });
    },

    async getAllProjectPages() {
        return await projectPagesCollection.find({}).toArray();
    },

    async addCollaborator(projectId, collaboratorId) {
        const result = await projectPagesCollection.updateOne(
            { _id: new ObjectId(projectId) },
            { $addToSet: { collaborators: new ObjectId(collaboratorId) } }
        );
        return result.modifiedCount > 0;
    }
};