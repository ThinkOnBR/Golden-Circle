import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Agora apontamos para 'dist' para alinhar com o padrão de hospedagem
const buildPath = path.join(__dirname, 'dist');

console.log(`[Server] Iniciando...`);
console.log(`[Server] Diretório atual: ${__dirname}`);
console.log(`[Server] Procurando build em: ${buildPath}`);

if (!fs.existsSync(buildPath)) {
  console.error(`[CRITICAL ERROR] A pasta '${buildPath}' não foi encontrada! Rode 'npm run build'.`);
} else {
  console.log(`[Success] Pasta de build encontrada. Servindo arquivos...`);
}

// Serve arquivos estáticos (JS, CSS, Imagens), mas NÃO serve o index.html automaticamente
// para podermos interceptar e injetar a variável de ambiente.
app.use(express.static(buildPath, { index: false }));

// Cache simples para o HTML processado
let cachedHtml = null;

app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    // Se já temos em cache (para performance), servimos direto
    if (cachedHtml && process.env.NODE_ENV === 'production') {
      return res.send(cachedHtml);
    }

    try {
      let html = fs.readFileSync(indexPath, 'utf8');
      
      // INJEÇÃO EM TEMPO DE EXECUÇÃO (RUNTIME)
      // Pega a chave do ambiente do servidor (Cloud Run / Coolify) e injeta no HTML do cliente
      const apiKey = process.env.API_KEY || '';
      
      // Substitui o placeholder criado no index.html
      // Nota: A string de busca deve ser EXATAMENTE igual ao que está no index.html
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
    res.status(500).send('Erro: index.html não encontrado. O deploy falhou na etapa de build.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Rodando na porta ${PORT}`);
});