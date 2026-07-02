#!/bin/sh
set -e

echo "🔄 Application des migrations Prisma..."
npx prisma db push --accept-data-loss

echo "🚀 Démarrage IMMO-tec API..."
exec node dist/server.js
