#!/bin/sh
set -e

echo "🚀 [Alentapp] Iniciando proceso de despliegue productivo..."

echo "📦 Aplicando migraciones con Prisma Deploy..."
node ./node_modules/prisma/build/index.js migrate deploy --schema=packages/api/prisma/schema.prisma

echo "✅ Estructura de Base de Datos lista."
echo "🔥 Activando entorno web de Fastify..."

exec node dist-prod/packages/api/src/app.js