FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN rm -rf node_modules package-lock.json && npm install --legacy-peer-deps

COPY . .

RUN npm run build

ENV NODE_ENV=production

EXPOSE 5000

CMD ["npm", "run", "start"]
