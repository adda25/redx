FROM node:12

WORKDIR /usr/src/app

COPY . .

RUN npm install --only=production

CMD ["node", "index.js" ]
