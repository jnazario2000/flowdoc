import express from 'express';
import { editHistoryController } from '../controllers/editHistoryController.js';

const router = express.Router();

// Create an edit history entry
router.post('/editHistories', editHistoryController.createEditHistory);

// Get all edit histories
router.get('/editHistories', editHistoryController.getAllEditHistories);

// Get edit histories by user ID
router.get('/editHistories/user/:userId', editHistoryController.getEditHistoriesByUser);

// Get edit histories by document/project ID
router.get('/editHistories/document/:documentId', editHistoryController.getEditHistoriesByDocument);

// Search history by keyword
router.get('/editHistories/search/:keyword', editHistoryController.searchEditHistoryByKeyword);

// Delete an edit history
router.delete('/editHistories/:id', editHistoryController.deleteEditHistory);

// Update an edit history
router.put('/editHistories/:id', editHistoryController.updateEditHistory);

export default router;
