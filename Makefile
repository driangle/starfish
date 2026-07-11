.PHONY: help check check-lite check-golang check-golang-lite check-sdk-typescript check-sdk-typescript-lite check-server-typescript check-server-typescript-lite check-integration test-golang test-typescript test-sdk-typescript-golang test-sdk-typescript-typescript test-sdk-typescript test-sdk test-integration install-hooks lint lint-sdk-typescript lint-server-typescript lint-adapters-p5js lint-integration lint-examples-typescript lint-golang

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

# --- Check-lite (lint + compile only, no tests) ---

check-lite: lint check-golang-lite check-sdk-typescript-lite check-server-typescript-lite check-integration ## Lint and compile all projects (no tests)

check-golang-lite: ## Vet the Go server (no tests)
	@echo "==> go vet (servers/golang)"
	@cd servers/golang && go vet ./...

# --- Check (lint, compile, unit test — no servers needed) ---

check: check-lite check-golang check-sdk-typescript check-server-typescript ## Run all lint, compile, and unit test checks

check-golang: check-golang-lite ## Vet and unit-test the Go server
	@echo "==> go test (servers/golang)"
	@cd servers/golang && go test ./...

check-sdk-typescript-lite: ## Type-check the TypeScript SDK (no tests)
	@cd sdks/typescript && npm install --silent 2>/dev/null && echo "==> tsc --noEmit (sdks/typescript)" && npx tsc --noEmit

check-sdk-typescript: check-sdk-typescript-lite ## Type-check and unit-test the TypeScript SDK
	@echo "==> vitest run (sdks/typescript)"
	@cd sdks/typescript && npx vitest run

check-server-typescript-lite: ## Type-check the TypeScript server (no tests)
	@cd servers/typescript && npm install --silent 2>/dev/null && echo "==> tsc --noEmit (servers/typescript)" && npx tsc --noEmit

check-server-typescript: check-server-typescript-lite ## Type-check and unit-test the TypeScript server
	@echo "==> vitest run (servers/typescript)"
	@cd servers/typescript && npx vitest run

check-integration: ## Type-check the integration test suite
	@cd tests/integration && npm install --silent 2>/dev/null && echo "==> tsc --noEmit (tests/integration)" && npx tsc --noEmit

# --- Integration tests (require a running server) ---

test-golang: ## Run protocol integration tests against the Go server
	@./scripts/run-integration-tests.sh golang

test-typescript: ## Run protocol integration tests against the TypeScript server
	@./scripts/run-integration-tests.sh typescript

test-sdk-typescript-golang: ## Run TypeScript SDK integration tests against the Go server
	@./scripts/run-sdk-integration-tests.sh typescript golang

test-sdk-typescript-typescript: ## Run TypeScript SDK integration tests against the TypeScript server
	@./scripts/run-sdk-integration-tests.sh typescript typescript

test-sdk-typescript: test-sdk-typescript-golang test-sdk-typescript-typescript ## Run TypeScript SDK integration tests against all servers

test-sdk: test-sdk-typescript ## Run all SDK integration tests against all servers

test-integration: test-golang test-typescript test-sdk ## Run all integration tests (protocol + SDK)

# --- Lint (file-length rules) ---

lint: lint-sdk-typescript lint-server-typescript lint-adapters-p5js lint-integration lint-examples-typescript lint-golang ## Run file-length linting across all projects

lint-sdk-typescript: ## Lint the TypeScript SDK
	@cd sdks/typescript && npm install --silent 2>/dev/null && echo "==> eslint (sdks/typescript)" && npx eslint .

lint-server-typescript: ## Lint the TypeScript server
	@cd servers/typescript && npm install --silent 2>/dev/null && echo "==> eslint (servers/typescript)" && npx eslint .

lint-adapters-p5js: ## Lint the p5.js adapter
	@cd adapters/p5js && npm install --silent 2>/dev/null && echo "==> eslint (adapters/p5js)" && npx eslint .

lint-integration: ## Lint the integration tests
	@cd tests/integration && npm install --silent 2>/dev/null && echo "==> eslint (tests/integration)" && npx eslint .

lint-examples-typescript: ## Lint the TypeScript examples
	@cd examples/typescript && npm install --silent 2>/dev/null && echo "==> eslint (examples/typescript)" && npx eslint .

lint-golang: ## Lint the Go server (file length)
	@echo "==> check-file-length (servers/golang)"
	@./scripts/check-file-length.sh servers/golang

# --- Hooks ---

install-hooks: ## Install git pre-commit hook
	@echo "Installing pre-commit hook..."
	@cp scripts/pre-commit .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "Done."
