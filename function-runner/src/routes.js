const express = require('express');
const executor = require('./executor');

const router = express.Router();

router.post('/execute', (req, res) => {
  try {
    const { code, input } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const result = executor.execute(code, input);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

module.exports = router;