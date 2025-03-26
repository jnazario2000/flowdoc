import express from 'express';
const router = express.Router();

router.post('/edit-history', async (req, res) => {
  const { projectId, editor, changes } = req.body;
  const editHistory = req.app.locals.db.collection('editHistory');

  try {
    await editHistory.insertOne({
      projectId,
      editor,
      changes,
      timestamp: new Date()
    });
    res.status(200).json({ message: 'Edit history saved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save edit history' });
  }
});

router.get('/edit-history/:projectId', async (req, res) => {
  const editHistory = req.app.locals.db.collection('editHistory');

  try {
    const data = await editHistory.find({ projectId: req.params.projectId }).toArray();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve edit history' });
  }
});

export default router;
