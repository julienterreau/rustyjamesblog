# syntax=docker/dockerfile:1

# ---------- 1. Installation des dépendances ----------
    FROM node:24-slim AS deps
    WORKDIR /app
    COPY package.json package-lock.json ./
    RUN --mount=type=cache,target=/root/.npm \
        npm ci --prefer-offline --no-audit --no-fund
    
    # ---------- 2. Build de l'application ----------
    FROM node:24-slim AS builder
    WORKDIR /app
    COPY --from=deps /app/node_modules ./node_modules
    COPY . .
    
    # Si ces valeurs changent sur Coolify, Docker invalide le cache à partir d'ici
    ARG NEXT_PUBLIC_SANITY_PROJECT_ID
    ARG NEXT_PUBLIC_SANITY_DATASET
    
    ENV NEXT_PUBLIC_SANITY_PROJECT_ID=$NEXT_PUBLIC_SANITY_PROJECT_ID
    ENV NEXT_PUBLIC_SANITY_DATASET=$NEXT_PUBLIC_SANITY_DATASET
    ENV NEXT_TELEMETRY_DISABLED=1
    
    RUN npm run build
    
    # ---------- 3. Image finale (légère) ----------
    FROM node:24-slim AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    ENV NEXT_TELEMETRY_DISABLED=1
    ENV HOSTNAME=0.0.0.0
    ENV PORT=8082
    
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/.next/standalone ./
    COPY --from=builder /app/.next/static ./.next/static
    
    EXPOSE 8082
    CMD ["node", "server.js"]