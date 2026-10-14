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
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://ingizer.com https://*.ingizer.com https://*.railway.app;");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
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

  // PROXY BACKEND IA (/api/ai/copilot)
  if (pathname === '/api/ai/copilot') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    }

    let body = '';
    let bytes = 0;
    const MAX_BYTES = 100000; // 100kb limit

    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Payload Too Large' }));
      }
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const parsedBody = body ? JSON.parse(body) : {};
        const prompt = parsedBody.prompt;
        if (!prompt || typeof prompt !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'prompt is required' }));
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;

        if (geminiKey) {
          try {
            const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
            const gRes = await fetch(gUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 800 }
              })
            });

            if (gRes.ok) {
              const gData = await gRes.json();
              const replyText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (replyText) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ ok: true, text: replyText, provider: 'gemini-server' }));
              }
            } else {
              const errData = await gRes.json().catch(() => ({}));
              console.warn('[AI Proxy] Gemini error HTTP ' + gRes.status, errData);
            }
          } catch (gErr) {
            console.warn('[AI Proxy] Error conectando a Gemini API:', gErr.message);
          }
        }

        if (openaiKey) {
          try {
            const oRes = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.4,
                max_tokens: 800
              })
            });

            if (oRes.ok) {
              const oData = await oRes.json();
              const replyText = oData.choices?.[0]?.message?.content;
              if (replyText) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ ok: true, text: replyText, provider: 'openai-server' }));
              }
            }
          } catch (oErr) {
            console.warn('[AI Proxy] Error conectando a OpenAI API:', oErr.message);
          }
        }

        // Si no hay API key configurada en las variables de entorno de Railway
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          ok: false,
          error: 'no_server_key',
          message: 'El servidor no tiene configurada GEMINI_API_KEY ni OPENAI_API_KEY en variables de entorno.'
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Reject unsupported HTTP methods for other routes
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    return res.end('Method Not Allowed');
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

