# Usa uma imagem base do Node.js
FROM node:20-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia apenas package.json e package-lock.json primeiro (para melhor cache)
COPY package*.json ./

# Instala dependências de produção
RUN npm install --production

# Copia o restante do código da aplicação
COPY . .

# Expõe a porta que o Express usa
EXPOSE 3000

# Comando para rodar a aplicação
CMD ["node", "server.js"]