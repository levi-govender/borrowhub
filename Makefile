# BorrowHub local developer entrypoints.
# Tabs are required. Run `make help` for targets.

SHELL := /bin/bash
.DEFAULT_GOAL := help

PNPM ?= pnpm
COMPOSE ?= docker compose
BACKEND := services/backend
GRADLEW := ./gradlew
BFF_URL := http://127.0.0.1:3000
JAVA_URL := http://127.0.0.1:8080
WEB_URL := http://127.0.0.1:5173

.PHONY: help install db-up db-down db-logs db-reset db-psql \
	bff backend web mobile \
	typecheck test test-backend test-bff test-mobile test-web build \
	docker-build docker-up docker-down \
	bicep-build \
	health clean

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "BorrowHub make targets\n\n"} \
		/^[a-zA-Z0-9_-]+:.*##/ { printf "  %-16s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install JS workspace dependencies (pnpm)
	$(PNPM) install

db-up: ## Start local PostgreSQL and wait until healthy
	$(COMPOSE) up -d --wait

db-down: ## Stop local PostgreSQL (keep volume)
	$(COMPOSE) down

db-logs: ## Tail PostgreSQL logs
	$(COMPOSE) logs -f postgres

db-reset: ## Stop PostgreSQL and delete the named volume
	$(COMPOSE) down -v

db-psql: ## Open psql in the Compose Postgres container
	$(COMPOSE) exec postgres psql -U borrowhub -d borrowhub

bff: ## Run the TypeScript BFF on :3000
	$(PNPM) dev:bff

backend: ## Run Spring Boot on :8080 (dev profile seeds catalogue)
	cd $(BACKEND) && SPRING_PROFILES_ACTIVE=dev $(GRADLEW) bootRun

web: ## Run the admin Vite app on :5173
	$(PNPM) dev:web

mobile: ## Start the Expo employee app
	$(PNPM) --filter @borrowhub/mobile start

typecheck: ## Typecheck BFF, web, and mobile
	$(PNPM) typecheck
	$(PNPM) --filter @borrowhub/mobile exec tsc --noEmit

test-backend: ## Run Java unit/context tests
	cd $(BACKEND) && $(GRADLEW) test

test-bff: ## Run BFF catalogue and booking proxy tests
	$(PNPM) --filter @borrowhub/bff test

test-mobile: ## Run mobile catalogue API tests
	$(PNPM) --filter @borrowhub/mobile test

test-web: ## Run web inventory API tests
	$(PNPM) --filter @borrowhub/web test

test: typecheck test-backend test-bff test-mobile test-web ## Typecheck and automated tests

build: ## Production-build web, BFF, and Java jar
	$(PNPM) build:web
	$(PNPM) build:bff
	cd $(BACKEND) && $(GRADLEW) bootJar

docker-build: ## Build Java and BFF container images
	$(COMPOSE) --profile apps build

docker-up: ## Run Postgres, Java, and BFF from container images
	$(COMPOSE) --profile apps up -d --wait --build

docker-down: ## Stop Compose services including app containers (keep volume)
	$(COMPOSE) --profile apps down

bicep-build: ## Compile infra/main.bicep (az CLI, or Azure CLI container if az is missing)
	@if command -v az >/dev/null 2>&1; then \
		az bicep build --file infra/main.bicep; \
	elif command -v docker >/dev/null 2>&1; then \
		docker run --rm -v "$(CURDIR)/infra:/infra" -w /infra mcr.microsoft.com/azure-cli:latest az bicep build --file main.bicep; \
	else \
		echo "Neither az nor docker is available to compile Bicep." >&2; \
		exit 1; \
	fi

health: ## Curl local BFF and Java health endpoints
	@echo "BFF live:"; curl -sfS $(BFF_URL)/health/live; echo
	@echo "BFF ready:"; curl -sfS $(BFF_URL)/health/ready; echo
	@echo "Java live:"; curl -sfS $(JAVA_URL)/actuator/health/liveness; echo
	@echo "Java ready:"; curl -sfS $(JAVA_URL)/actuator/health/readiness; echo

clean: ## Remove JS build output and Gradle build dirs
	rm -rf apps/web/dist services/bff/dist
	cd $(BACKEND) && $(GRADLEW) clean
