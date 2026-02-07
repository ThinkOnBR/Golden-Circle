import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Cloud Run injeta a porta via variável de ambiente PORT (geralmente 8080).
const PORT = parseInt(process.env.PORT) || 8080;

// MUDANÇA: Aponta para 'build' (definido no vite.config.ts) para evitar a pasta 'dist' que está com erro de volume no Cloud
const buildPath = path.join(__dirname, 'build');

console.log(`[Server] Inicializando Confraria Platform...`);
console.log(`[Server] Diretório base: ${__dirname}`);
console.log(`[Server] Build path alvo: ${buildPath}`);

// LÓGICA DE AUTO-CORREÇÃO (SELF-HEALING)
// Se a pasta build não existir, tentamos rodar o build dentro do container antes de subir.
if (!fs.existsSync(buildPath)) {
  console.warn(`[WARNING] A pasta '${buildPath}' não foi encontrada.`);
  console.log(`[AUTO-FIX] Iniciando processo de build de emergência...`);
  
  try {
    // 1. Instalar dependências (pode demorar um pouco)
    console.log(`[AUTO-FIX] Rodando 'npm install'...`);
    // Usamos --no-package-lock para evitar conflitos de versão antigos (erro ETARGET)
    execSync('npm install --no-package-lock', { stdio: 'inherit' });

    // 2. Construir o projeto
    console.log(`[AUTO-FIX] Rodando 'npm run build'...`);
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log(`[Success] Build de emergência concluído com sucesso!`);
  } catch (error) {
    console.error(`[CRITICAL ERROR] Falha no build de emergência:`, error);
    // Não damos exit(1) imediatamente para tentar manter o container vivo e permitir logs, 
    // mas o servidor provavelmente falhará ao servir arquivos.
  }
} else {
  console.log(`[Success] Pasta de build encontrada.`);
}

// Serve arquivos estáticos
app.use(express.static(buildPath, { index: false }));

let cachedHtml = null;

app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    if (cachedHtml && process.env.NODE_ENV === 'production') {
      return res.send(cachedHtml);
    }

    try {
      let html = fs.readFileSync(indexPath, 'utf8');
      
      const apiKey = process.env.API_KEY || '';
      
      if (!apiKey) {
        console.warn("[Server Warning] API_KEY não detectada nas variáveis de ambiente do servidor.");
      }

      html = html.replace(
        'window.env = { API_KEY: "" };', 
        `window.env = { API_KEY: "${apiKey}" };`
      );

      cachedHtml = html;
      res.send(html);
    } catch (err) {
      console.error("[Server] Erro ao ler index.html:", err);
      res.status(500).send("Erro interno ao processar a aplicação.");
    }
  } else {
    console.error("[Server] index.html não encontrado mesmo após tentativa de build.");
    res.status(500).send('Erro crítico: Aplicação não pôde ser construída. Verifique os logs.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Servidor rodando e ouvindo em http://0.0.0.0:${PORT}`);
});