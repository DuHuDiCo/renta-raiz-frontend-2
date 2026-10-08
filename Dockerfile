# Etapa 1: Dependencias (Cacheable)
FROM node:20.15.1-alpine AS deps
WORKDIR /usr/src/app
COPY package*.json ./
# Usamos npm ci para velocidad y determinismo
RUN npm ci --omit=dev

# Etapa 2: Build
FROM node:20.15.1-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
# Instalamos TODO (incluyendo devDependencies para poder compilar)
# Preferiblemente copiamos los node_modules de una etapa cacheada, pero npm ci es rápido
RUN npm ci 
COPY . .
RUN npm run build

# Etapa 3: Runtime
FROM node:20.15.1-alpine AS runtime

# Instalar zona horaria (Solo necesario aquí)
RUN apk --no-cache add tzdata && \
    cp /usr/share/zoneinfo/America/Bogota /etc/localtime && \
    echo "America/Bogota" > /etc/timezone && \
    apk del tzdata

WORKDIR /usr/src/app

# Copiamos SOLO los node_modules de producción desde la etapa 1
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copiamos el build desde la etapa 2
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/robots.txt ./

# Configuración final de archivos estáticos
# (el sitemap ya no es un archivo: lo genera server.ts en cada consulta)
RUN cp /usr/src/app/robots.txt /usr/src/app/dist/renta-raiz-frontend-2/browser/

EXPOSE 4000

CMD ["node", "dist/renta-raiz-frontend-2/server/server.mjs"]