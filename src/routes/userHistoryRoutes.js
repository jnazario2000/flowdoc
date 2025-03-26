import express from 'express';
const router = express.Router();

router.post('/user-history', async (req, res) => {
  const { username, projectId, hours, summary } = req.body;
  const userHistory = req.app.locals.db.collection('userHistory');

  try {
    await userHistory.insertOne({
      username,
      projectId,
      hours,
      summary,
      timestamp: new Date()
    });
    res.status(200).json({ message: 'User history saved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save user history' });
  }
});

router.get('/user-history/:username', async (req, res) => {
  const userHistory = req.app.locals.db.collection('userHistory');

  try {
    const data = await userHistory.find({ username: req.params.username }).toArray();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user history' });
  }
});

export default router;
