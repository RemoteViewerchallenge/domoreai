import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import fetch from 'node-fetch';

const app = express();
const port = 8000;

let servers = [];

async function fetchServers() {
  try {
    const response = await fetch('http://registry:8080/servers');
    servers = await response.json();
    console.log('Fetched servers:', servers);
    setupProxies();
  } catch (error) {
    console.error('Failed to fetch servers:', error);
  }
}

function setupProxies() {
  servers.forEach(server => {
    app.use(`/${server.name}`, createProxyMiddleware({
      target: server.url,
      changeOrigin: true,
      ws: true,
      pathRewrite: {
        [`^/${server.name}`]: '',
      },
    }));
  });
}

app.listen(port, () => {
  console.log(`Proxy server listening at http://localhost:${port}`);
  fetchServers();
});
