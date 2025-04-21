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

  async getAllEditHistories(req, res) {
    try {
      const histories = await editHistoryService.getAllEditHistories();
      res.status(200).json(histories);
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

  async getEditHistoriesByDocument(req, res) {
    try {
      const { documentId } = req.params;
      const histories = await editHistoryService.getEditHistoriesByDocument(documentId);
      res.status(200).json(histories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async searchEditHistoryByKeyword(req, res) {
    try {
      const { keyword } = req.params;
      const results = await editHistoryService.searchByKeyword(keyword);
      res.status(200).json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async deleteEditHistory(req, res) {
    try {
      const { id } = req.params;
      const success = await editHistoryService.deleteEditHistory(id);
      if (success) {
        res.json({ message: 'Edit history deleted' });
      } else {
        res.status(404).json({ message: 'Edit history not found' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async updateEditHistory(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const success = await editHistoryService.updateEditHistory(id, updates);
      if (success) {
        res.json({ message: 'Edit history updated' });
      } else {
        res.status(404).json({ message: 'Edit history not found or no change made' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
