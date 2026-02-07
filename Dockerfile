FROM node:20-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependência
COPY package.json ./

# Instalar todas as dependências (incluindo as de desenvolvimento para o build)
RUN npm install

# Copiar todo o código fonte
COPY . .

# Construir o projeto (Gera a pasta 'dist')
RUN npm run build

# Expor a porta que o server.js usa
EXPOSE 8080

# Iniciar o servidor Express
CMD ["node", "server.js"]
