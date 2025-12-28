const express = require('express');
const containerService = require('./containerService');
const httpClient = require('./httpClient');

const router = express.Router();

router.post('/execute', async (req, res) => {
  try {
    const { image, payload } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    if (!payload) {
      return res.status(400).json({ error: 'Payload is required' });
    }

    // Get or create container
    const containerInfo = await containerService.getOrCreate(image);

    // Wait for container to be healthy
    await httpClient.waitForHealth(containerInfo.url);

    // Send request to Function Runner
    const result = await httpClient.post(
      `${containerInfo.url}/execute`,
      payload
    );

    res.json({
      success: true,
      containerId: containerInfo.id.substring(0, 12),
      result
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/containers', (req, res) => {
  const containers = containerService.listContainers();
  res.json({ containers });
});

router.delete('/containers/:image', async (req, res) => {
  try {
    await containerService.stopContainer(req.params.image);
    res.json({ success: true, message: 'Container stopped' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    activeContainers: containerService.listContainers().length
  });
});

module.exports = router;