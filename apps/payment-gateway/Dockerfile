FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY tsconfig.json ./
COPY src ./src

RUN npm install -g typescript ts-node

EXPOSE 3001

CMD ["ts-node", "src/index.ts"]
