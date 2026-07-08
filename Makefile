.PHONY: help check check-lite check-golang check-golang-lite check-integration test-golang test-integration install-hooks

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

# --- Check-lite (lint + compile only, no tests) ---

check-lite: check-golang-lite check-integration ## Lint and compile all projects (no tests)

check-golang-lite: ## Vet the Go server (no tests)
	@echo "==> go vet (servers/golang)"
	@cd servers/golang && go vet ./...

# --- Check (lint, compile, unit test — no servers needed) ---

check: check-golang check-integration ## Run all lint, compile, and unit test checks

check-golang: check-golang-lite ## Vet and unit-test the Go server
	@echo "==> go test (servers/golang)"
	@cd servers/golang && go test ./...

check-integration: ## Type-check the integration test suite
	@cd tests/integration && npm install --silent 2>/dev/null && echo "==> tsc --noEmit (tests/integration)" && npx tsc --noEmit

# --- Integration tests (require a running server) ---

test-golang: ## Run integration tests against the Go server
	@./scripts/run-integration-tests.sh golang

test-integration: test-golang ## Run integration tests against all available servers

# --- Hooks ---

install-hooks: ## Install git pre-commit hook
	@echo "Installing pre-commit hook..."
	@cp scripts/pre-commit .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "Done."
