# Usa uma imagem leve do Node.js 20 baseada em Alpine Linux
FROM node:20-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de definição de dependências
COPY package*.json ./

# Instala todas as dependências do projeto
# Adicionamos --legacy-peer-deps para evitar conflitos de versão se houver
RUN npm install --legacy-peer-deps

# Copia todo o restante do código fonte para o container
COPY . .

# Executa o comando de build do Vite (gera a pasta 'dist')
RUN npm run build

# Expõe a porta 8080 (usada pelo server.js)
EXPOSE 8080

# Comando para iniciar a aplicação (roda 'node server.js' conforme seu package.json)
CMD ["npm", "start"]
