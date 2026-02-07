FROM node:20

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de definição de dependências
COPY package*.json ./

# Instala as dependências ignorando conflitos de versão (flag --legacy-peer-deps)
# Isso resolve o erro "command failed with exit code 1" no npm install
RUN npm install --legacy-peer-deps

# Copia o restante do código fonte
COPY . .

# Executa o build do Vite (gera a pasta dist)
RUN npm run build

# Expõe a porta que o server.js utiliza
EXPOSE 8080

# Inicia o servidor
CMD ["node", "server.js"]
