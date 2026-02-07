import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT) || 8080;
const BUILD_PATH = path.join(__dirname, 'build');

// Estado da aplicação
let appStatus = 'INITIALIZING'; // INITIALIZING, BUILDING, READY, ERROR
let buildLogs = [];

// Tipos MIME para servir arquivos estáticos corretamente sem Express
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
  '.xml': 'application/xml'
};

// Função auxiliar para rodar comandos do sistema
const runCommand = (command, args) => {
  return new Promise((resolve, reject) => {
    // shell: true ajuda a encontrar o comando npm no path
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

// Lógica de Build Automático
const startBuildProcess = async () => {
  if (appStatus === 'BUILDING' || appStatus === 'READY') return;
  
  try {
    appStatus = 'BUILDING';
    buildLogs.push('Iniciando processo de build (Node Native Server)...');
    
    // 1. NPM INSTALL
    buildLogs.push('Instalando dependências...');
    // --omit=dev se quiser economizar tempo, mas precisamos do 'vite' que geralmente é devDep
    await runCommand('npm', ['install', '--no-package-lock', '--loglevel=error']);
    
    // 2. NPM RUN BUILD
    buildLogs.push('Compilando aplicação (Vite)...');
    await runCommand('npm', ['run', 'build']);
    
    // Verificação final
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

// SERVER NATIVO (Sem dependência do Express)
const server = http.createServer((req, res) => {
  // Health Check básico para o Cloud Run
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  // Se o app estiver pronto, serve os arquivos estáticos
  if (appStatus === 'READY') {
    let filePath = path.join(BUILD_PATH, req.url === '/' ? 'index.html' : req.url);
    
    // Segurança básica para evitar sair do diretório
    if (!filePath.startsWith(BUILD_PATH)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Se não existir arquivo, assume que é uma rota SPA e serve index.html
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(BUILD_PATH, 'index.html');
    }

    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if(error.code == 'ENOENT'){
           // Fallback final
           res.writeHead(404);
           res.end('Arquivo não encontrado');
        } else {
           res.writeHead(500);
           res.end('Erro interno: ' + error.code);
        }
      } else {
        // Injeção de API Key no HTML principal
        if (extname === '.html') {
          const apiKey = process.env.API_KEY || '';
          let html = content.toString('utf8');
          html = html.replace('window.env = { API_KEY: "" };', `window.env = { API_KEY: "${apiKey}" };`);
          content = Buffer.from(html, 'utf8');
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
    return;
  }

  // TELA DE LOADING (Enquanto instala/compila)
  if (appStatus === 'BUILDING' || appStatus === 'INITIALIZING') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html style="background:#050505;color:#e5e5e5;font-family:sans-serif;">
      <head>
        <title>Instalando Confraria...</title>
        <meta http-equiv="refresh" content="3">
      </head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="border:1px solid #ca8a04;padding:2rem;border-radius:10px;background:#111;text-align:center;max-width:500px;">
          <h1 style="color:#eab308;margin-bottom:10px;">Preparando Sistema</h1>
          <p style="color:#888;">Instalando dependências e compilando o frontend.<br>Isso acontece apenas na primeira inicialização.</p>
          <div style="margin:20px 0;width:100%;background:#222;height:10px;border-radius:5px;overflow:hidden;">
            <div style="width:100%;height:100%;background:#eab308;animation:pulse 2s infinite;"></div>
          </div>
          <div style="text-align:left;background:#000;padding:10px;border-radius:5px;font-family:monospace;font-size:10px;color:#0f0;height:100px;overflow:hidden;">
            ${buildLogs.map(l => `> ${l}<br>`).join('')}
          </div>
        </div>
        <style>@keyframes pulse { 0% {opacity:0.5} 50% {opacity:1} 100% {opacity:0.5} }</style>
      </body>
      </html>
    `);
    return;
  }

  // TELA DE ERRO
  if (appStatus === 'ERROR') {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <h1>Erro Crítico na Instalação</h1>
      <pre style="background:#222;color:#f55;padding:20px;">${buildLogs.join('\n')}</pre>
    `);
  }
});

// Inicia o servidor IMEDIATAMENTE para o Cloud Run não dar timeout
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Servidor NATIVO rodando na porta ${PORT}`);
  
  // Verifica se o build já existe
  if (fs.existsSync(path.join(BUILD_PATH, 'index.html'))) {
    console.log('[Server] Build encontrado. Pulando instalação.');
    appStatus = 'READY';
  } else {
    // Pequeno delay para garantir que o server.listen processe antes de travar a CPU com npm install
    console.log('[Server] Build não encontrado. Agendando instalação...');
    setTimeout(startBuildProcess, 2000);
  }
});