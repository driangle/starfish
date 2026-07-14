# Scripts

Utility scripts for CI, testing, and development workflow.

| Script | Description |
|--------|-------------|
| `run-integration-tests.sh` | Run protocol integration tests against a specified server (starts the server, runs tests, shuts down) |
| `run-sdk-integration-tests.sh` | Run SDK integration tests against a specified server |
| `check-file-length.sh` | Enforce a maximum file length (200 lines) across source files |
| `pre-commit` | Git pre-commit hook for linting and formatting checks |

## Usage

These scripts are typically invoked through Makefile targets:

```bash
make test-integration   # Runs both integration test scripts against all servers
make install-hooks      # Copies pre-commit hook into .git/hooks/
```

To run directly:

```bash
./scripts/run-integration-tests.sh golang
./scripts/run-sdk-integration-tests.sh typescript golang
```
