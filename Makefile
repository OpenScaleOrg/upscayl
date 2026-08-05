# Upscayl Studio — thin wrapper over the npm scripts in package.json.
# ponytail: no per-platform dist targets; use `npm run dist:<target>` directly.

# On Windows, make's shell mis-runs the extensionless `npm` script shipped by the
# Node installer (fails to exec it, or loses its exit code) — prefer npm.cmd when
# it exists. Elsewhere the .cmd isn't there and this resolves to plain npm.
# (`command -v npm.cmd` can't see .cmd files, so probe by running it.)
WINDOWS_NPM := $(shell npm.cmd --version 2>/dev/null)
NPM := $(if $(WINDOWS_NPM),npm.cmd,npm)
NPX := $(if $(WINDOWS_NPM),npx.cmd,npx)

.DEFAULT_GOAL := help
.PHONY: help setup dev prod build dist test lint format typecheck check clean

help: ## Show this help
	@node -e "require('fs').readFileSync('Makefile','utf8').split('\n').filter(l=>/^[a-z:-]+:.*##/.test(l)).forEach(l=>{const[t,d]=l.split('##');console.log('  '+t.split(':')[0].padEnd(12)+d.trim())})"

setup: ## Install dependencies (npm ci, falls back to npm install without a lockfile)
	@node -e "process.exit(require('fs').existsSync('package-lock.json')?0:1)" && $(NPM) ci || $(NPM) install

dev: ## Compile TS and launch Electron with the Next dev server
	$(NPM) run dev

build: ## Compile TS + validate schema + build the renderer
	$(NPM) run build

prod: build ## Run the production build in Electron (packaged renderer)
	$(NPX) cross-env NODE_ENV=production electron .

dist: ## Package installers for the current platform
	$(NPM) run dist

test: ## Run unit tests
	$(NPM) test

lint: ## Lint the renderer
	$(NPM) run lint

format: ## Format everything with Prettier
	$(NPM) run format

typecheck: ## Typecheck main + renderer
	$(NPM) run typecheck

check: typecheck lint test ## Everything CI would run

clean: ## Remove build output
	$(NPM) run clean
