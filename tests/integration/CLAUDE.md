# Starfish Integration Tests

Integration tests that verify end-to-end behavior across SDK and server.

## Verification

Before considering any changes complete, run the following checks from this directory (`tests/integration/`):

```bash
# Type-check (must pass with no errors)
npm run check

# Lint
npm run lint

# Format check
npm run format:check

# Run tests (requires a running server)
npm run test
```

All commands must exit with code 0. Do not skip any of them.

If formatting fails, run `npm run format` and include the formatting fixes in your changes.
