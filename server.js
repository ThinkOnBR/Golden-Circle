import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT) || 8080;
const BUILD_PATH = path.join(__dirname, 'dist');
const PUBLIC_PATH = path.join(__dirname, 'public');

let appStatus = 'INITIALIZING'; 
let buildLogs = [];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const runCommand = (command, args) => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'pipe', shell: true });
    process.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) buildLogs.push(msg);
    });
    process.on('close', (code) => code === 0 ? resolve() : reject(new Error('Command failed')));
  });
};

const startBuildProcess = async () => {
  if (appStatus === 'BUILDING') return;
  try {
    appStatus = 'BUILDING';
    await runCommand('npm', ['install', '--no-package-lock', '--loglevel=error']);
    await runCommand('npm', ['run', 'build']);
    appStatus = 'READY';
  } catch (error) {
    appStatus = 'ERROR';
  }
};

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200); res.end('OK'); return;
  }

  // Blinda contra requisições diretas ao código fonte no mobile
  if (req.url.endsWith('.tsx')) {
    res.writeHead(404); res.end('Not Found'); return;
  }

  if (appStatus === 'READY') {
    let cleanUrl = req.url.split('?')[0];
    const safePath = path.normalize(cleanUrl).replace(/^(\.\.[\/\\])+/, '');
    
    // Especial para manifest e assets raiz
    const isRootAsset = ['manifest.json', 'favicon.ico', 'service-worker.js'].includes(safePath.replace(/^\//, ''));
    const isIconRequest = safePath.includes('icons/') || safePath.includes('favicon');

    let filePath = path.join(BUILD_PATH, safePath === '/' ? 'index.html' : safePath);
    
    // Se for um ícone, tenta a pasta public primeiro para ser mais resiliente
    if (isIconRequest) {
      const pPath = path.join(PUBLIC_PATH, safePath);
      if (fs.existsSync(pPath) && !fs.statSync(pPath).isDirectory()) {
        filePath = pPath;
      }
    }

    // Lógica de busca resiliente (Build -> Public -> Root)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const pPath = path.join(PUBLIC_PATH, safePath);
      const rPath = path.join(__dirname, safePath);
      
      if (fs.existsSync(pPath) && !fs.statSync(pPath).isDirectory()) {
        filePath = pPath;
      } else if (fs.existsSync(rPath) && !fs.statSync(rPath).isDirectory()) {
        filePath = rPath;
      } else if (!path.extname(safePath)) {
        filePath = path.join(BUILD_PATH, 'index.html');
      } else {
        res.writeHead(404); res.end('Not Found'); return;
      }
    }

    const extname = path.extname(filePath).toLowerCase();
    let contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    // Forçar MIME do manifest para evitar 403 no mobile
    if (safePath.includes('manifest.json')) {
      contentType = 'application/manifest+json; charset=utf-8';
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(500); res.end('Internal Server Error');
      } else {
        if (extname === '.html') {
          let html = content.toString('utf8').trimStart();
          
          const assetsDir = path.join(BUILD_PATH, 'assets');
          if (fs.existsSync(assetsDir)) {
            const files = fs.readdirSync(assetsDir);
            const mainJs = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
            const mainCss = files.find(f => f.startsWith('index-') && f.endsWith('.css'));
            
            if (mainJs) {
              html = html.replace(/<script.*src=["'].*index\.tsx["'].*><\/script>/, `<script type="module" src="/assets/${mainJs}"></script>`);
              html = html.replace(/src=["']index\.tsx["']/, `src="/assets/${mainJs}"`);
            }
            if (mainCss) {
              if (!html.includes(mainCss)) {
                html = html.replace('</head>', `<link rel="stylesheet" href="/assets/${mainCss}"></head>`);
              }
            }
          }

          const apiKey = process.env.API_KEY || '';
          html = html.replace(/window\.env\s*=\s*\{\s*API_KEY:\s*""\s*\};/, `window.env = { API_KEY: "${apiKey}" };`);
          content = Buffer.from(html, 'utf8');
        }
        
        const headers = {
          'Content-Type': contentType,
          'X-Content-Type-Options': 'nosniff',
          'Access-Control-Allow-Origin': '*'
        };

        if (extname === '.html' || isRootAsset) {
          headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0';
        } else {
          headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        }
            
        res.writeHead(200, headers);
        res.end(content);
      }
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><h1>Iniciando Confraria...</h1><script>setTimeout(()=>location.reload(), 2000)</script></body></html>');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  setTimeout(startBuildProcess, 1000);
});