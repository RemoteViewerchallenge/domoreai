import express from 'express';

const app = express();
const port = 8080;

app.get('/servers', (req, res) => {
  res.json([
    {
      name: 'lootbox',
      url: 'http://lootbox:3000',
    },
  ]);
});

app.listen(port, () => {
  console.log(`Registry server listening at http://localhost:${port}`);
});
