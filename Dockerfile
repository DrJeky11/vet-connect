# Production image. Mount a volume at /data so listings edits and subscriber
# data survive restarts and redeploys:
#   docker build -t vet-connect .
#   docker run -p 3000:3000 -v vetdata:/data --env-file .env vet-connect
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    VERIFIER_DB_PATH=/data/verifier.db \
    OUTREACH_DB_PATH=/data/outreach.db
COPY --from=build /app/package.json /app/next.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/data ./data
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
