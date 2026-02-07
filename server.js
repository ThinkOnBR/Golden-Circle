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

app.use(express.static(buildPath));

app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('Erro: index.html não encontrado. O deploy falhou na etapa de build.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Rodando na porta ${PORT}`);
});