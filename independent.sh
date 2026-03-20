
docker compose --env-file ./web/.env -f docker-compose-prod.yml build --no-cache web

# Run
docker compose --env-file ./web/.env -f docker-compose-prod.yml up -d web --no-deps