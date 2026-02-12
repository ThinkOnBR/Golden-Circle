import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, URL } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT) || 8080;
const BUILD_PATH = path.join(__dirname, 'build');

// Estado da aplicação
let appStatus = 'INITIALIZING'; // INITIALIZING, BUILDING, READY, ERROR
let buildLogs = [];

// Tipos MIME
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain'
};

const runCommand = (command, args) => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'pipe', shell: true });
    
    process.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) {
        console.log(`[BUILD] ${msg}`);
        buildLogs.push(msg);
        if (buildLogs.length > 50) buildLogs.shift();
      }
    });

    process.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.error(`[BUILD STDERR] ${msg}`);
    });

    process.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Comando '${command}' falhou com código ${code}`));
    });
  });
};

const startBuildProcess = async () => {
  if (appStatus === 'BUILDING' || appStatus === 'READY') return;
  
  try {
    appStatus = 'BUILDING';
    buildLogs.push('Iniciando processo de build...');
    
    // 1. NPM INSTALL
    buildLogs.push('Instalando dependências...');
    await runCommand('npm', ['install', '--no-package-lock', '--loglevel=error']);
    
    // 2. NPM RUN BUILD
    buildLogs.push('Compilando aplicação (Vite)...');
    await runCommand('npm', ['run', 'build']);
    
    if (fs.existsSync(path.join(BUILD_PATH, 'index.html'))) {
      appStatus = 'READY';
      buildLogs.push('Build concluído com sucesso!');
      console.log('[Server] Aplicação pronta para uso.');
    } else {
      throw new Error('Pasta build criada, mas index.html não encontrado.');
    }
  } catch (error) {
    console.error('[FATAL] Erro no processo de build:', error);
    appStatus = 'ERROR';
    buildLogs.push(`ERRO CRÍTICO: ${error.message}`);
  }
};

const server = http.createServer((req, res) => {
  // Health Check
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  // APP READY
  if (appStatus === 'READY') {
    // 1. CORREÇÃO MOBILE: Sanitizar URL
    // Remove query params (ex: ?fbclid=...) que causam erro 403 ao tentar buscar arquivo com nome sujo
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url, `${protocol}://${host}`);
    let pathname = parsedUrl.pathname;

    // Normaliza caminho para evitar Directory Traversal
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    
    // Determina o arquivo físico
    let filePath = path.join(BUILD_PATH, safePath === '/' ? 'index.html' : safePath);

    // Lógica de SPA (Single Page Application)
    // Se o arquivo solicitado NÃO existe no disco...
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        // Se tem extensão (ex: style.css, logo.png), é um arquivo faltando -> 404
        if (path.extname(filePath)) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        // Se não tem extensão (ex: /dashboard, /login), é uma rota do App -> serve index.html
        filePath = path.join(BUILD_PATH, 'index.html');
    }

    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      } else {
        // Injeção de API Key apenas no HTML
        if (extname === '.html') {
          const apiKey = process.env.API_KEY || '';
          let html = content.toString('utf8');
          // Substituição segura
          html = html.replace(/window\.env\s*=\s*\{\s*API_KEY:\s*""\s*\};/, `window.env = { API_KEY: "${apiKey}" };`);
          content = Buffer.from(html, 'utf8');
        }
        
        // Cache control para assets estáticos vs HTML
        const cacheControl = extname === '.html' ? 'no-cache' : 'public, max-age=31536000';
        
        res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': cacheControl
        });
        res.end(content, 'utf-8');
      }
    });
    return;
  }

  // TELA DE LOADING
  if (appStatus === 'BUILDING' || appStatus === 'INITIALIZING') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html style="background:#050505;color:#e5e5e5;font-family:sans-serif;">
      <head><meta http-equiv="refresh" content="3"><title>Carregando...</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="border:1px solid #ca8a04;padding:2rem;border-radius:10px;background:#111;text-align:center;">
          <h1 style="color:#eab308;">Iniciando Sistema</h1>
          <p>Configurando ambiente seguro...</p>
          <div style="margin:20px 0;width:200px;background:#222;height:4px;border-radius:2px;overflow:hidden;">
            <div style="width:100%;height:100%;background:#eab308;animation:p 2s infinite;"></div>
          </div>
          <pre style="text-align:left;font-size:10px;color:#666;">${buildLogs[buildLogs.length-1] || 'Aguardando...'}</pre>
        </div>
        <style>@keyframes p { 0% {transform:translateX(-100%)} 100% {transform:translateX(100%)} }</style>
      </body>
      </html>
    `);
    return;
  }

  // TELA DE ERRO
  if (appStatus === 'ERROR') {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Erro Fatal</h1><pre>${buildLogs.join('\n')}</pre>`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Rodando na porta ${PORT}`);
  if (fs.existsSync(path.join(BUILD_PATH, 'index.html'))) {
    appStatus = 'READY';
  } else {
    setTimeout(startBuildProcess, 1000);
  }
});