const express = require('express');
const app = express();
const PORT = 3002;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});
