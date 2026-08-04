# Contributing to Upscayl

Thanks for helping improve Upscayl! This guide covers the local dev setup and
the repository standards.

## Prerequisites

- Node **18.20.5** (see [`.nvmrc`](.nvmrc) / the `volta` pin in `package.json`).
  With [Volta](https://volta.sh) or `nvm`, the right version is selected
  automatically.

## Getting started

```bash
npm install     # also installs git hooks via husky (prepare script)
npm run dev     # compile electron + launch the app
```

## Quality tooling

| Command                | What it does                                     |
| ---------------------- | ------------------------------------------------ |
| `npm run typecheck`    | Type-checks electron/common **and** the renderer |
| `npm run lint`         | ESLint over the renderer (`next lint`)           |
| `npm run lint:fix`     | ESLint with autofix                              |
| `npm run format`       | Formats the repo with Prettier                   |
| `npm run format:check` | Verifies formatting without writing              |
| `npm test`             | Unit tests (Vitest) — pure logic in `test/unit`  |
| `npm run test:watch`   | Vitest in watch mode                             |
| `npm run test:e2e`     | End-to-end UI tests (Playwright + Electron)      |

### Testing

- **Unit** ([Vitest](https://vitest.dev)) covers pure logic — crop geometry
  (`renderer/lib/crop.ts`), output-size math (`renderer/lib/output-size.ts`) and
  path helpers. Fast, no DOM. Files live in `test/unit/`.
- **E2E** ([Playwright](https://playwright.dev) driving Electron) launches the
  real built app and exercises UI flows that don't need the AI engine — menus,
  tools, panels, the Preferences dialog. Files live in `e2e/`. `test:e2e`
  builds the app first (`pretest:e2e`), so just run `npm run test:e2e`.

### Git hooks (automatic)

Managed by [husky](https://typicode.github.io/husky/):

- **pre-commit** → [`lint-staged`](.lintstagedrc.json): runs ESLint `--fix` and
  Prettier on staged files only.
- **commit-msg** → [`commitlint`](commitlint.config.js): enforces
  [Conventional Commits](https://www.conventionalcommits.org/).

If hooks don't run after cloning, run `npm run prepare` once.

## Commit messages

Use Conventional Commits, e.g.:

```
feat(studio): add crop tool to the canvas
fix(electron): guard window controls when no main window
chore: bump dependencies
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

## Pull requests

CI (`.github/workflows/lint.yml`) type-checks every PR. Please run
`npm run typecheck` locally before pushing.
