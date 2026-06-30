# ── Build ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl dumb-init

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
  && npm cache clean --force

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY scripts/start-prod.sh ./scripts/start-prod.sh

RUN chmod +x ./scripts/start-prod.sh \
  && mkdir -p uploads \
  && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["./scripts/start-prod.sh"]
