FROM node:20

WORKDIR /app

# Instalación de dependencias
COPY package*.json ./
COPY packages/web/package*.json ./packages/web/
RUN npm install

# Copiado de código fuente
COPY . .

EXPOSE 5173

# IMPORTANTE: El flag --host permite que el tráfico salga del contenedor
CMD ["npm", "run", "dev", "-w", "packages/web", "--", "--host", "0.0.0.0"]