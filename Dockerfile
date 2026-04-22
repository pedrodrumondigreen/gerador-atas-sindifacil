FROM node:20-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

ENV NODE_OPTIONS="--max-old-space-size=3072"

CMD ["node", "server.js"]
