FROM node:16.4.2-alpine

RUN mkdir -p /srv/app/gecko
WORKDIR /srv/app/gecko

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "run", "server"]