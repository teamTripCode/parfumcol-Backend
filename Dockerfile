# ====== Etapa 1: Construcción ======
FROM node:20-alpine AS builder

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos necesarios para instalar dependencias
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma

# Instalar dependencias
RUN npm install

# Ejecutar prisma generate
RUN npx prisma generate

# Copiar el resto del código
COPY . .

# Compilar el backend (NestJS)
RUN npm run build

# ====== Etapa 2: Producción ======
FROM node:20-alpine AS production

# Crear directorio de trabajo
WORKDIR /app

# Copiar los archivos necesarios del builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Exponer el puerto de la aplicación
EXPOSE 8080

# Variable de entorno para producción
ENV NODE_ENV=production

# Comando de inicio flexible para producción o desarrollo
CMD ["sh", "-c", "npx prisma generate && if [ \"$NODE_ENV\" = 'production' ]; then node dist/main.js; else npm run start:dev; fi"]
