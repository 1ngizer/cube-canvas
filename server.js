import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

const server = http.createServer((req, res) => {
  // Security Headers
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Reject unsupported HTTP methods
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    return res.end('Method Not Allowed');
  }

  // Parse path
  let parsedUrl;
  try {
    parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Bad Request');
  }

  const pathname = decodeURIComponent(parsedUrl.pathname);

  // Health check for Railway / Cloud monitoring
  if (pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('OK');
  }

  // Directory traversal check
  if (pathname.includes('..') || pathname.includes('\\')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Denied');
  }

  // Normalize file path and resolve within DIST_DIR
  const safePath = path.normalize(pathname);
  const filePath = path.join(DIST_DIR, safePath);

  // Ensure resolved path is strictly within DIST_DIR
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Denied');
  }

  // Check if file exists in dist
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // Cache headers for static assets
      if (pathname.startsWith('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }

      res.writeHead(200, { 'Content-Type': contentType });
      if (req.method === 'HEAD') {
        return res.end();
      }
      const stream = fs.createReadStream(filePath);
      return stream.pipe(res);
    }

    // If an asset with extension was requested and not found, return 404
    if (path.extname(pathname)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found');
    }

    // SPA fallback: serve index.html for all client routes without file extensions
    const indexPath = path.join(DIST_DIR, 'index.html');
    fs.readFile(indexPath, (indexErr, content) => {
      if (indexErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Build not found. Please run "npm run build" first.');
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      if (req.method === 'HEAD') {
        return res.end();
      }
      return res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Cube Canvas] Servidor activo en puerto ${PORT} (http://localhost:${PORT})`);
});

