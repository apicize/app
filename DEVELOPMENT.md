# Development Guide

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [Yarn](https://yarnpkg.com/) (managed via Corepack, see `packageManager` in package.json)
- [Rust](https://www.rust-lang.org/tools/install) (1.91+)

### Linux Build Dependencies

```bash
sudo apt-get install -y libssl-dev libglib2.0-dev libpango1.0-dev libatk1.0-dev \
  libgdk-pixbuf-2.0-dev libgtk-3-dev libjavascriptcoregtk-4.1-dev \
  libwebkit2gtk-4.1-dev librsvg2-dev patchelf
```

## Monorepo Structure

This is a Yarn workspace monorepo with three packages:

| Package | Description |
|---------|-------------|
| `@apicize/lib-typescript` | TypeScript model definitions (workbook/workspace data structures) |
| `@apicize/toolkit` | React/MobX UI component library |
| `app` | Tauri desktop application (React frontend + Rust backend) |

The Tauri backend depends on the [apicize_lib](https://github.com/apicize/lib-rust) Rust crate for HTTP execution and test running.

## Getting Started

```bash
yarn            # Install all dependencies
yarn start      # Build and run the Tauri app in dev mode
```

## Development Commands

### Running the App

| Command | Description |
|---------|-------------|
| `yarn start` | Build and launch the Tauri app in dev mode |
| `yarn watch` | Same as start, but rebuilds lib-typescript and toolkit on source changes |
| `yarn dev` | Run only the Webpack dev server (frontend only, no Tauri) |

### Building

| Command | Description |
|---------|-------------|
| `yarn build` | Build all workspaces (lib-typescript, toolkit, then app) |
| `yarn build-deps` | Build lib-typescript and toolkit only |
| `yarn build:release` | Build production release binary |

### Workspace-Specific Commands

```bash
# lib-typescript
cd @apicize/lib-typescript
yarn build          # Compile TypeScript (outputs to dist/)
yarn watch          # Watch mode
yarn rebuild        # Clean build

# toolkit
cd @apicize/toolkit
yarn build          # Compile TypeScript + copy CSS
yarn watch          # Watch TypeScript
yarn watch-css      # Watch toolkit.css
yarn test           # Run Vitest tests

# app (Rust backend)
cd app/src-tauri
cargo build         # Debug build
cargo build --release
cargo test
cargo clippy -- -D warnings
```

### Utility Commands

| Command | Description |
|---------|-------------|
| `yarn clean` | Remove all build artifacts and node_modules |
| `yarn icons` | Generate app icons from SVG artwork |

## Version Management

All packages in the monorepo share a single version number. The `version.mjs` script manages this.

### Setting a New Version

```bash
node version.mjs <version>
```

This updates the version in all of the following locations and runs `yarn` to update the lockfile:

- `package.json` (root)
- `@apicize/lib-typescript/package.json`
- `@apicize/toolkit/package.json`
- `app/src-tauri/Cargo.toml`
- `app/src-tauri/tauri.conf.json`
- `app/package.json` (version + toolkit dependency)

### Checking Version Consistency

```bash
node version.mjs --check              # Compare all packages against root package.json version
node version.mjs --check <version>    # Compare all packages against a specific version
```

Exits with 0 if all versions match, -1 if any mismatch is found.

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/main.yml`) builds and publishes the app for all platforms. It produces signed binaries for Windows (Azure Trusted Signing) and macOS (Apple notarization).

### Build Types

The workflow supports three build types:

| Type | Trigger | Tag Format | Release |
|------|---------|------------|---------|
| **release** | Push tag `v<major>.<minor>.<patch>` | `v0.29.12` | Public release |
| **rc** | Manual dispatch (select "rc") | `v0.29.12-rc` | Draft prerelease |
| **dev** | Manual dispatch (select "dev") | `v0.29.12-dev` | Draft prerelease |

### Release Process

1. Ensure all version numbers are consistent:
   ```bash
   node version.mjs --check
   ```

2. Commit all changes and push to `main`.

3. Tag and push to trigger the release build:
   ```bash
   git tag v0.29.12
   git push origin v0.29.12
   ```

   The pipeline validates that the tag matches the format `v<major>.<minor>.<patch>` and that all project versions match the tag version.

4. The workflow builds, signs, and publishes installers for all platforms:
   - Windows: `.msi` (Azure Trusted Signing)
   - Linux: `.deb`, `.rpm`, `.AppImage`
   - macOS: `.dmg` (Apple notarized, both ARM and Intel)

### Development / RC Builds

1. Go to **Actions > publish > Run workflow** in GitHub.
2. Select `dev` or `rc` as the build type.
3. The pipeline verifies version consistency, appends a build suffix, and creates a draft prerelease.

### Pipeline Jobs

| Job | Purpose |
|-----|---------|
| **setup** | Checks out code, verifies version consistency, determines build type and version |
| **lint** | Runs `cargo clippy -- -D warnings` on the Rust backend |
| **publish-tauri** | Builds and publishes the app across a 4-platform matrix (macOS ARM, macOS Intel, Linux, Windows) |

### Required Secrets and Variables

The workflow requires the following GitHub repository configuration:

**Secrets:**
- `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_API_PRIVATE_KEY` (macOS signing)
- `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET` (Windows signing)

**Variables:**
- `APPLE_SIGNING_IDENTITY`, `APPLE_API_ISSUER`, `APPLE_API_KEY` (macOS signing)
- `AZURE_CLIENT_ID`, `AZURE_ENDPOINT`, `AZURE_CERT_PROFILE_NAME`, `AZURE_CODE_SIGNING_NAME` (Windows signing)

## Preparing a New Release

1. Update the version number:
   ```bash
   node version.mjs 0.30.0
   ```

2. Update `CHANGELOG.md` with release notes.

3. Commit and push:
   ```bash
   git add -A
   git commit -m "Release v0.30.0"
   git push
   ```

4. Optionally trigger an RC build from GitHub Actions to validate before tagging.

5. Tag and release:
   ```bash
   git tag v0.30.0
   git push origin v0.30.0
   ```
