# server/Dockerfile
FROM node:20

WORKDIR /app/server

# Copier package.json + lock du backend
COPY server/package*.json ./

# Installer dépendances (npm ci OU npm install, pas les deux)
RUN npm install

# Copier common AVANT le code backend (important pour les paths)
COPY common/ /app/common/

# Copier tout le code backend
COPY server/ ./

# Build NestJS
RUN npm run build

# Debug: afficher EXACTEMENT ce qui a été généré
RUN echo "=== Contenu de dist/ ===" && ls -laR dist/ || echo "dist/ n'existe pas"
RUN echo "=== Contenu de out/ ===" && ls -laR out/ || echo "out/ n'existe pas"
RUN echo "=== Recherche de tous les .js ===" && find . -name "*.js" -not -path "./node_modules/*" | sort

EXPOSE 3000

CMD ["npm", "run", "start:prod"]