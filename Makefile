.PHONY: help check check-lite check-golang check-golang-lite check-sdk-typescript check-sdk-typescript-lite check-integration test-golang test-integration install-hooks

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

# --- Check-lite (lint + compile only, no tests) ---

check-lite: check-golang-lite check-sdk-typescript-lite check-integration ## Lint and compile all projects (no tests)

check-golang-lite: ## Vet the Go server (no tests)
	@echo "==> go vet (servers/golang)"
	@cd servers/golang && go vet ./...

# --- Check (lint, compile, unit test — no servers needed) ---

check: check-golang check-sdk-typescript check-integration ## Run all lint, compile, and unit test checks

check-golang: check-golang-lite ## Vet and unit-test the Go server
	@echo "==> go test (servers/golang)"
	@cd servers/golang && go test ./...

check-sdk-typescript-lite: ## Type-check the TypeScript SDK (no tests)
	@cd sdks/typescript && npm install --silent 2>/dev/null && echo "==> tsc --noEmit (sdks/typescript)" && npx tsc --noEmit

check-sdk-typescript: check-sdk-typescript-lite ## Type-check and unit-test the TypeScript SDK
	@echo "==> vitest run (sdks/typescript)"
	@cd sdks/typescript && npx vitest run

check-integration: ## Type-check the integration test suite
	@cd tests/integration && npm install --silent 2>/dev/null && echo "==> tsc --noEmit (tests/integration)" && npx tsc --noEmit

# --- Integration tests (require a running server) ---

test-golang: ## Run protocol integration tests against the Go server
	@./scripts/run-integration-tests.sh golang

test-sdk-typescript-golang: ## Run TypeScript SDK integration tests against the Go server
	@./scripts/run-sdk-integration-tests.sh typescript golang

test-sdk-typescript: test-sdk-typescript-golang ## Run TypeScript SDK integration tests against all servers

test-sdk: test-sdk-typescript ## Run all SDK integration tests against all servers

test-integration: test-golang test-sdk ## Run all integration tests (protocol + SDK)

# --- Hooks ---

install-hooks: ## Install git pre-commit hook
	@echo "Installing pre-commit hook..."
	@cp scripts/pre-commit .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "Done."
