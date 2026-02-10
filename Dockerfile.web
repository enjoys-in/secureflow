# -----------------
# Build stage
# -----------------
FROM oven/bun:1-alpine AS build

WORKDIR /app

COPY ./web/package.json ./web/bun.lockb* ./
RUN bun install --frozen-lockfile

COPY ./web ./
RUN bun run build

# -----------------
# Production stage
# -----------------
FROM oven/bun:1-alpine

WORKDIR /app
COPY --from=build /app/dist ./dist

EXPOSE 4173

# Serve static files using Bun
CMD ["bun", "run", "preview"]
