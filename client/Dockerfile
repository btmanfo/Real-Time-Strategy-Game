# client/Dockerfile
FROM node:20 AS build

WORKDIR /app

# Copier package.json du client
COPY client/package*.json ./client/

WORKDIR /app/client
RUN npm install

# Copier le code client et common
WORKDIR /app
COPY client/ ./client
COPY common/ ./common

# Build Angular
WORKDIR /app/client
RUN npm run build

# Serveur léger
FROM node:20

WORKDIR /app

RUN npm install -g http-server

# Copier UNIQUEMENT le contenu de dist/client (pas dist/)
COPY --from=build /app/client/dist/client ./dist

EXPOSE 4200

CMD ["http-server", "dist", "-p", "4200", "-c-1"]