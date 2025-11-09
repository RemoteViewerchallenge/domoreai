FROM node:18-alpine

WORKDIR /app

COPY apps/proxy/package.json .
RUN npm install

COPY apps/proxy/index.js .

EXPOSE 8000

CMD ["npm", "start"]
