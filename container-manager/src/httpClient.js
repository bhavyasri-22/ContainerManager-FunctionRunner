const axios = require('axios');

class HttpClient {
  async post(url, data, timeout = 30000) {
    try {
      const response = await axios.post(url, data, { timeout });
      return response.data;
    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }

  async waitForHealth(url, maxAttempts = 60) { // more retries
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await axios.get(`${url}/health`, { timeout: 2000 }); // increase timeout
        console.log(`Health check passed on attempt ${i+1}`);
        return true;
      } catch (error) {
        console.log(`Health check attempt ${i+1} failed: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1s
      }
    }
    throw new Error('Container health check failed');
  }
}

module.exports = new HttpClient();
