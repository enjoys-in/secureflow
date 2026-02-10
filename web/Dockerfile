# ----------------- # Build stage # -----------------
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# ----------------- # Production stage # -----------------
FROM oven/bun:1-alpine
WORKDIR /app

# Install 'serve' globally
RUN bun install -g serve

COPY --from=build /app/dist ./dist
EXPOSE 4173

CMD ["serve", "-s", "dist", "-l", "4173"]