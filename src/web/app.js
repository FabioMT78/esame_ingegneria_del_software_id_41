const express = require('express');

const app = express();

app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;
