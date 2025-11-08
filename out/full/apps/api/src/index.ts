import express from 'express';

const app = express();
const port = 4000;

app.get('/', (req, res) => {
  res.send('Hello from the API!');
});

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
