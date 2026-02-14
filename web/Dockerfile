# ----------------- # Build stage # -----------------
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile
COPY . .

ARG VITE_API_URL
ARG VITE_APP_ENV=production

# Set as environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_ENV=$VITE_APP_ENV


RUN bun run build

# ----------------- # Production stage # -----------------
FROM oven/bun:1-alpine
WORKDIR /app

# Install 'serve' globally
RUN bun install -g serve

COPY --from=build /app/dist ./dist
EXPOSE 4173

CMD ["serve", "-s", "dist", "-l", "4173"]