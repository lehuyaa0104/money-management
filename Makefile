.PHONY: install dev-web build-web lint-web up down logs start-db stop-db start-api stop-api status test-api lint-api

install:
	cd web && npm install

dev-web:
	cd web && npm run dev

build-web:
	cd web && npm run build

lint-web:
	cd web && npm run lint

# Backend (needs Docker or Podman and a .env — see .env.example)
COMPOSE ?= $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "podman compose")

# Always recreate the API container: podman-compose (unlike docker compose) keeps
# running the old container after a rebuild. MySQL is left running.
up:
	$(COMPOSE) build api
	$(COMPOSE) up -d mysql
	$(COMPOSE) up -d --no-deps --force-recreate api

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f api

# Start/stop one service. Stopping keeps the data; `up --no-deps` also recreates
# the container if `make down` removed it, without touching the other service.
start-db:
	$(COMPOSE) up -d --no-deps mysql

stop-db:
	$(COMPOSE) stop mysql

start-api:
	$(COMPOSE) up -d --no-deps api

stop-api:
	$(COMPOSE) stop api

# Containers + whether the API can reach MySQL
status:
	@$(COMPOSE) ps
	@echo
	@curl -s -m 3 -w '  (HTTP %{http_code})\n' http://localhost:$${API_PORT:-8080}/healthz || echo 'API không phản hồi'

test-api:
	cd api && go test ./...

lint-api:
	cd api && go vet ./... && test -z "$$(gofmt -l .)"
