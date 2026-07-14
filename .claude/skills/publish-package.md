# Publish Package

Publish a Starfish package (SDK, server, or adapter) to its registry.

## When to Use

Use this skill when working on any task tagged `publish` — publishing an SDK, server, or adapter to npm, PyPI, or pkg.go.dev.

## Instructions

The user will provide a package path (e.g. `sdks/python`, `servers/golang`, `adapters/p5js`).

### 1. Identify the Ecosystem

Determine the registry from the package contents:

| Indicator | Registry | Metadata file |
|---|---|---|
| `package.json` | npm | `package.json` |
| `pyproject.toml` | PyPI | `pyproject.toml` |
| `go.mod` | pkg.go.dev | `go.mod` |
| None of the above | GitHub Releases | n/a |

### 2. Common Steps (all ecosystems)

1. **LICENSE** — add MIT license if missing (copy from `sdks/python/LICENSE` as template)
2. **README** — ensure it has installation instructions (`go get`, `pip install`, `npm install`)
3. **Metadata** — verify the package metadata file has:
   - Correct package name
   - Version number
   - Description
   - License field
   - Repository URL (`https://github.com/driangle/starfish`)

### 3. Registry-Specific Steps

#### npm (TypeScript / JavaScript)

- Verify `package.json` has: `name` (scoped as `@driangle/<name>`), `version`, `description`, `license`, `repository`, `main`, `types`, `exports`, `files`
- `files` should only include `dist/` — source files should not be published
- For servers/CLIs: add a `bin` field
- Build: `npm run build`
- Publish: `npm publish` (requires npm account)

#### PyPI (Python)

- Verify `pyproject.toml` `[project]` section has: `name`, `version`, `description`, `license`, `classifiers`, `urls`, `dependencies`
- Build backend should be `hatchling`
- Build: `python -m build`
- Publish: `twine upload dist/*` (requires PyPI API token)
- For servers/CLIs: verify entry point works after `pip install`

#### pkg.go.dev (Go)

- Verify `go.mod` module path matches `github.com/driangle/starfish/<subpath>`
- No manual upload needed — pkg.go.dev indexes automatically once the repo is public
- Tag format for Go monorepo modules: `<subpath>/vX.Y.Z` (e.g. `servers/golang/v0.1.0`)
- Trigger proxy indexing after tagging:
  ```bash
  GOPROXY=https://proxy.golang.org GO111MODULE=on go list -m <module>@<version>
  ```
- **Note:** This only works when the repo is public. For private repos, users need `GOPRIVATE=github.com/driangle/starfish`

#### GitHub Releases (no registry)

- Package the distribution artifact (e.g. `.tox` archive for TouchDesigner)
- Create a GitHub Release with the artifact attached

### 4. Tagging & Publishing

- Commit all changes before tagging
- Create a version tag appropriate to the ecosystem
- Push the tag: `git push origin <tag>`
- For npm/PyPI: publish via the CI release workflow if one exists, or manually

### 5. Verification

- Verify the package is installable from the registry
- Check that the registry page shows correct documentation
- If the repo is private, note this as a blocker for public registry verification
