const express = require('express');
const routes = require('./routes');

const app = express();
const PORT = 8080;

app.use(express.json());
app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Container Manager on port ${PORT}`);
});