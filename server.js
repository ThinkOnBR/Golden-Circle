import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Cloud Run injeta a porta via variável de ambiente PORT (geralmente 8080).
// É crucial converter para Int e ter um fallback.
const PORT = parseInt(process.env.PORT) || 8080;

// Agora apontamos para 'dist' para alinhar com o padrão de hospedagem
const buildPath = path.join(__dirname, 'dist');

console.log(`[Server] Inicializando Confraria Platform...`);
console.log(`[Server] Diretório base: ${__dirname}`);
console.log(`[Server] Build path alvo: ${buildPath}`);
console.log(`[Server] Porta configurada: ${PORT}`);

if (!fs.existsSync(buildPath)) {
  console.error(`[CRITICAL ERROR] A pasta '${buildPath}' não foi encontrada! O build do Docker falhou.`);
  process.exit(1); // Encerra o processo para o container reiniciar se necessário
} else {
  console.log(`[Success] Build verificado com sucesso.`);
}

// Serve arquivos estáticos (JS, CSS, Imagens), mas NÃO serve o index.html automaticamente
// para podermos interceptar e injetar a variável de ambiente.
app.use(express.static(buildPath, { index: false }));

// Cache simples para o HTML processado
let cachedHtml = null;

app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    // Se já temos em cache (para performance), servimos direto em produção
    if (cachedHtml && process.env.NODE_ENV === 'production') {
      return res.send(cachedHtml);
    }

    try {
      let html = fs.readFileSync(indexPath, 'utf8');
      
      // INJEÇÃO EM TEMPO DE EXECUÇÃO (RUNTIME)
      // Pega a chave do ambiente do servidor (Cloud Run / Coolify) e injeta no HTML do cliente
      const apiKey = process.env.API_KEY || '';
      
      if (!apiKey) {
        console.warn("[Server Warning] API_KEY não detectada nas variáveis de ambiente do servidor.");
      }

      // Substitui o placeholder criado no index.html
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
    console.error("[Server] index.html não encontrado no caminho esperado.");
    res.status(500).send('Erro: index.html não encontrado. Contacte o administrador.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Servidor rodando e ouvindo em http://0.0.0.0:${PORT}`);
});