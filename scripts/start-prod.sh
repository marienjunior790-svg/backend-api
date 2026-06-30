#!/bin/sh
set -e

echo "🔄 Application des migrations Prisma..."
npx prisma migrate deploy

echo "🚀 Démarrage IMMO-tec API..."
exec node dist/server.js
