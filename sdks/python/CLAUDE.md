# Starfish Python SDK

Python client SDK for the Starfish real-time communication protocol.

## Verification

Before considering any changes complete, run the following checks from this directory (`sdks/python/`):

```bash
# Lint
ruff check starfish/ tests/

# Format check
ruff format --check starfish/ tests/

# Unit tests
pytest tests/
```

All commands must exit with code 0. Do not skip any of them.

If formatting fails, run `ruff format starfish/ tests/` and include the formatting fixes in your changes.
