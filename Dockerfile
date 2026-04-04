FROM node:22-trixie-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3220
CMD ["node", "server/index.js"]