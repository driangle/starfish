.PHONY: help check check-lite check-golang check-golang-lite check-sdk-typescript check-sdk-typescript-lite check-sdk-typescript-integration check-sdk-python check-sdk-python-lite check-sdk-swift check-sdk-swift-lite check-server-typescript check-server-typescript-lite check-integration test-golang test-typescript test-sdk-typescript-golang test-sdk-typescript-typescript test-sdk-typescript test-sdk-python-golang test-sdk-python-typescript test-sdk-python test-sdk test-integration install-hooks lint lint-sdk-typescript lint-sdk-python lint-server-typescript lint-adapters-p5js lint-integration lint-examples-typescript lint-golang format format-sdk-python format-check format-check-sdk-typescript format-check-sdk-python format-check-adapters-p5js format-check-integration format-check-examples-typescript format-check-golang

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

# --- Check-lite (lint + compile only, no tests) ---

check-lite: lint format-check check-golang-lite check-sdk-typescript-lite check-sdk-typescript-integration check-sdk-python-lite check-sdk-swift-lite check-server-typescript-lite check-integration ## Lint, format-check, and compile all projects (no tests)

check-golang-lite: ## Vet the Go server (no tests)
	@echo "==> go vet (servers/golang)"
	@cd servers/golang && go vet ./...

# --- Check (lint, compile, unit test — no servers needed) ---

check: check-lite check-golang check-sdk-typescript check-sdk-python check-sdk-swift check-server-typescript ## Run all lint, compile, and unit test checks

check-golang: check-golang-lite ## Vet and unit-test the Go server
	@echo "==> go test (servers/golang)"
	@cd servers/golang && go test ./...

check-sdk-typescript-lite: ## Type-check the TypeScript SDK (no tests)
	@cd sdks/typescript && npm install --silent 2>/dev/null && echo "==> tsc --noEmit (sdks/typescript)" && npx tsc --noEmit

check-sdk-typescript-integration: ## Type-check the TypeScript SDK integration tests
	@cd sdks/typescript && npm install --silent 2>/dev/null && echo "==> tsc --noEmit (sdks/typescript/integration)" && npx tsc --noEmit -p integration/tsconfig.json

check-sdk-typescript: check-sdk-typescript-lite ## Type-check and unit-test the TypeScript SDK
	@echo "==> vitest run (sdks/typescript)"
	@cd sdks/typescript && npx vitest run

check-sdk-python-lite: ## Lint the Python SDK (no tests)
	@cd sdks/python && pip install -e ".[dev]" --quiet 2>/dev/null && echo "==> ruff check (sdks/python)" && ruff check starfish/ tests/

check-sdk-python: check-sdk-python-lite ## Lint and unit-test the Python SDK
	@echo "==> pytest (sdks/python)"
	@cd sdks/python && pytest tests/

check-sdk-swift-lite: ## Compile the Swift SDK (no tests)
	@echo "==> swift build (sdks/swift)"
	@cd sdks/swift && swift build

check-sdk-swift: check-sdk-swift-lite ## Compile and unit-test the Swift SDK
	@echo "==> swift test (sdks/swift)"
	@cd sdks/swift && swift test

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

test-sdk-python-golang: ## Run Python SDK integration tests against the Go server
	@./scripts/run-sdk-integration-tests.sh python golang

test-sdk-python-typescript: ## Run Python SDK integration tests against the TypeScript server
	@./scripts/run-sdk-integration-tests.sh python typescript

test-sdk-python: test-sdk-python-golang test-sdk-python-typescript ## Run Python SDK integration tests against all servers

test-sdk: test-sdk-typescript test-sdk-python ## Run all SDK integration tests against all servers

test-integration: test-golang test-typescript test-sdk ## Run all integration tests (protocol + SDK)

# --- Lint (file-length rules) ---

lint: lint-sdk-typescript lint-sdk-python lint-server-typescript lint-adapters-p5js lint-integration lint-examples-typescript lint-golang ## Run file-length linting across all projects

lint-sdk-typescript: ## Lint the TypeScript SDK
	@cd sdks/typescript && npm install --silent 2>/dev/null && echo "==> eslint (sdks/typescript)" && npx eslint .

lint-sdk-python: ## Lint the Python SDK
	@cd sdks/python && pip install -e ".[dev]" --quiet 2>/dev/null && echo "==> ruff check (sdks/python)" && ruff check starfish/ tests/

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

# --- Format (auto-fix) ---

format: format-sdk-python ## Auto-format all projects
	@echo "==> prettier --write (sdks/typescript)"
	@cd sdks/typescript && npx prettier --write .
	@echo "==> prettier --write (adapters/p5js)"
	@cd adapters/p5js && npx prettier --write .
	@echo "==> prettier --write (tests/integration)"
	@cd tests/integration && npx prettier --write .
	@echo "==> prettier --write (examples/typescript)"
	@cd examples/typescript && npx prettier --write .
	@echo "==> gofmt -w (servers/golang)"
	@gofmt -w servers/golang/

# --- Format check (CI-safe, no writes) ---

format-check: format-check-sdk-typescript format-check-sdk-python format-check-adapters-p5js format-check-integration format-check-examples-typescript format-check-golang ## Check formatting across all projects

format-sdk-python: ## Format the Python SDK
	@cd sdks/python && pip install -e ".[dev]" --quiet 2>/dev/null && echo "==> ruff format (sdks/python)" && ruff format starfish/ tests/

format-check-sdk-typescript: ## Check formatting for the TypeScript SDK
	@cd sdks/typescript && npm install --silent 2>/dev/null && echo "==> prettier --check (sdks/typescript)" && npx prettier --check .

format-check-sdk-python: ## Check formatting for the Python SDK
	@cd sdks/python && pip install -e ".[dev]" --quiet 2>/dev/null && echo "==> ruff format --check (sdks/python)" && ruff format --check starfish/ tests/

format-check-adapters-p5js: ## Check formatting for the p5.js adapter
	@cd adapters/p5js && npm install --silent 2>/dev/null && echo "==> prettier --check (adapters/p5js)" && npx prettier --check .

format-check-integration: ## Check formatting for the integration tests
	@cd tests/integration && npm install --silent 2>/dev/null && echo "==> prettier --check (tests/integration)" && npx prettier --check .

format-check-examples-typescript: ## Check formatting for the TypeScript examples
	@cd examples/typescript && npm install --silent 2>/dev/null && echo "==> prettier --check (examples/typescript)" && npx prettier --check .

format-check-golang: ## Check Go formatting via gofmt
	@echo "==> gofmt -l (servers/golang)"
	@test -z "$$(gofmt -l servers/golang/)" || (echo "Go files need formatting:"; gofmt -l servers/golang/; exit 1)

# --- Hooks ---

install-hooks: ## Install git pre-commit hook
	@echo "Installing pre-commit hook..."
	@cp scripts/pre-commit .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "Done."
