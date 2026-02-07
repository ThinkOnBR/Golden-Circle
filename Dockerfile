# Usa uma imagem leve do Node.js 20
FROM node:20-slim

# Define a pasta de trabalho dentro do container
WORKDIR /app

# 1. Copia os arquivos de definição de dependência
COPY package.json ./
# (Opcional: COPY package-lock.json ./ se tiver)

# 2. Instala as dependências
# Usamos 'npm install' genérico para garantir que ele resolva conflitos de versão
# como o do @google/genai que apareceu no seu log
RUN npm install

# 3. Copia todo o código fonte do projeto para dentro do container
COPY . .

# 4. O PASSO CRÍTICO: Roda o build do Vite
# Isso vai ler seus arquivos .tsx e gerar a pasta /dist
RUN npm run build

# 5. Configura a porta (padrão do Cloud Run é 8080)
ENV PORT=8080
EXPOSE 8080

# 6. Inicia o servidor que vai servir a pasta /dist criada no passo 4
CMD ["node", "server.js"]
