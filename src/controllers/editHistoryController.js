import { editHistoryService } from '../services/editHistoryService.js';

export const editHistoryController = {
    async createEditHistory(req, res) {
        try {
            const { userId, documentId, changes } = req.body;
            const id = await editHistoryService.createEditHistory({ userId, documentId, changes });
            res.status(201).json({ id });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getEditHistoriesByUser(req, res) {
        try {
            const { userId } = req.params;
            const histories = await editHistoryService.getEditHistoriesByUser(userId);
            res.status(200).json(histories);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getAllEditHistories(req, res) {
        try {
            const histories = await editHistoryService.getAllEditHistories();
            res.status(200).json(histories);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
};