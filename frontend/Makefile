# Frontend Makefile

# Default environment
ENV ?= dev

# Docker compose command
COMPOSE_CMD = docker compose

# Environment-specific compose files
ifeq ($(ENV),dev)
	COMPOSE_FILE = -f compose.yml -f compose.dev.yml
else ifeq ($(ENV),prod)
	COMPOSE_FILE = -f compose.yml -f compose.prod.yml
else ifeq ($(ENV),uat)
	COMPOSE_FILE = -f compose.yml -f compose.uat.yml
else
	COMPOSE_FILE = -f compose.yml
endif

.PHONY: help build up down restart logs shell clean install lint

help: ## Show this help message
	@echo "Frontend Docker Commands:"
	@echo "========================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Usage: make <command> ENV=<dev|prod|uat>"
	@echo "Default ENV: dev"

build: ## Build the frontend container
	$(COMPOSE_CMD) $(COMPOSE_FILE) build

up: ## Start the frontend container
	$(COMPOSE_CMD) $(COMPOSE_FILE) up -d

down: ## Stop the frontend container
	$(COMPOSE_CMD) $(COMPOSE_FILE) down

restart: down up ## Restart the frontend container

logs: ## Show container logs
	$(COMPOSE_CMD) $(COMPOSE_FILE) logs -f frontend

shell: ## Access container shell
	$(COMPOSE_CMD) $(COMPOSE_FILE) exec frontend sh

clean: ## Remove containers, networks, and volumes
	$(COMPOSE_CMD) $(COMPOSE_FILE) down -v --remove-orphans
	docker system prune -f

install: ## Install dependencies inside container
	$(COMPOSE_CMD) $(COMPOSE_FILE) exec frontend sh -c 'if command -v bun >/dev/null 2>&1; then bun install; else npm install; fi'

lint: ## Run linting inside container
	$(COMPOSE_CMD) $(COMPOSE_FILE) exec frontend sh -c 'if command -v bun >/dev/null 2>&1; then bun run lint; else npm run lint; fi'

dev: ## Start development environment with hot reload
	ENV=dev $(MAKE) up

prod: ## Start production environment
	ENV=prod $(MAKE) up

uat: ## Start UAT environment
	ENV=uat $(MAKE) up
