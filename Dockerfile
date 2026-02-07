# Exemplo de estrutura correta:
FROM node:20-alpine

WORKDIR /app

# 1. Instala dependências
COPY package*.json ./
RUN npm install

# 2. Copia o código fonte
COPY . .

# 3. CRÍTICO: Gera o build de produção (cria a pasta 'dist')
# Sem isso, o server.js falha e derruba o container.
RUN npm run build

# 4. Garante que a porta 8080 (padrão do Cloud Run) esteja exposta
EXPOSE 8080
ENV PORT=8080

# 5. Inicia o servidor
CMD ["node", "server.js"]
