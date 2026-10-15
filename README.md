# dep.pin

Desktop app to review `package.json` files: pin dependency ranges to exact versions, browse available versions and their (peer) dependencies, check for updates with [npm-check-updates](https://github.com/raineorshine/npm-check-updates) and run `npm audit`, all without touching the original project.

Built with Angular 22 (standalone, signals, zoneless) and Electron 44.

## Installation

Download the latest version from the [releases page](https://github.com/ManuelGraf/dep.pin/releases):

- **Windows:** `dep.pin-<version>-win-x64.exe` is a portable app, no installation needed. The app is not code-signed, so Windows SmartScreen warns on the first start: choose _More info_ → _Run anyway_.
- **Linux:** `dep.pin-<version>-linux-x86_64.AppImage`. Make it executable (`chmod +x dep.pin-*.AppImage`) and run it.
- **macOS:** no prebuilt download yet (unsigned apps are blocked by Gatekeeper). Build it yourself, see [Development](#development).

### Requirements

**npm must be installed and available on the `PATH`** (it comes with [Node.js](https://nodejs.org/)). dep.pin uses your npm for the security audit: it runs `npm install --package-lock-only` and `npm audit` on a copy of the loaded package.json in a temporary folder. Your npm configuration (`.npmrc`, private registries, auth tokens) applies as usual. Without npm, everything except the audit still works.

Check with:

```bash
npm --version
```

## Development

Requires Node.js 24+.

```bash
npm install
npm start        # ng serve + Electron, with hot reload for the renderer
```

Changes to `electron/` require restarting `npm start`.

| Command                  | Description                                                     |
| ------------------------ | --------------------------------------------------------------- |
| `npm start`              | Run the app in development mode                                 |
| `npm run ng:serve`       | Run only the UI in a browser (audit / update check unavailable) |
| `npm run build`          | Build renderer and main process into `dist/`                    |
| `npm run electron:local` | Build and start the production app                              |
| `npm run package`        | Build a distributable into `release/` (electron-builder)        |
| `npm test`               | Unit tests (Vitest)                                             |
| `npm run e2e`            | End-to-end tests against the built Electron app (Playwright)    |
| `npm run lint`           | ESLint                                                          |

## Releasing

Releases are built by GitHub Actions ([.github/workflows/release.yml](.github/workflows/release.yml)) when a version tag is pushed:

```bash
npm version minor        # or patch / major: bumps package.json, commits and tags vX.Y.Z
git push --follow-tags
```

The workflow checks that the tag matches the `package.json` version, runs lint and tests, then builds the Windows and Linux apps and attaches them to the release of that tag:

- If there is no release for the tag yet, a **draft** with generated release notes is created. Review it on GitHub and publish it.
- If you already created the release yourself, the files are added to it (existing files with the same name are replaced).

To rebuild an existing tag, e.g. after fixing the workflow, use _Actions → Release → Run workflow_ and enter the tag.

Every push to `main` and every pull request runs lint, tests and a build ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Architecture

```
electron/            Electron main process (bundled with esbuild)
  main.ts            window, security settings, IPC handlers
  npm.ts             npm audit / npm-check-updates in a temp directory
  preload.ts         exposes the typed API as window.depPin
src/app/core/
  dep-pin-api.ts     IPC contract shared by preload, main and renderer
  models.ts          shared data types
  desktop.service.ts renderer side of the IPC bridge
  package-store.ts   the loaded package.json (signals), single source of truth
  dependency.service.ts  npm registry access with cache
```

The renderer runs sandboxed with `contextIsolation` and without Node.js integration. Everything that needs Node.js runs in the main process and is reached through the small API in `dep-pin-api.ts`.
