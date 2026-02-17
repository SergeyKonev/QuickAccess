---
last_updated: 2026-02-17
---

**Precedence**
All AGENTS.md files in sub‑directories override entries from parent directories.  The root file provides global defaults and a scope index.

**Global Rules**
- Use the project’s `manifest.json` as the source of truth for name, version, and description.
- All scripts must be runnable on Windows PowerShell; command names are listed exactly as they appear in `package.json` (if present) or `manifest.json`.
- Keep the file under 30 lines; detailed per‑scope docs live in each sub‑folder’s AGENTS.md.

**Pre‑commit Checks**
1. `git diff --name-only --cached` – ensure no stray files are added.
2. Run `npm run lint` (if `package.json` defines it) or `powershell -Command "Get-ChildItem -Recurse *.js | Select-String -Pattern 'TODO'"` to catch unfinished code.
3. Verify that every entry under *Scope Index* matches an existing directory.

**Scope Index**
- `background/` – background page logic and event listeners.
- `content‑scripts/` – scripts injected into web pages.
- `popup/` – UI for the extension popup, including sub‑folders:
  * `controllers/` – UI controllers (bookmark‑modal, import‑export, tariff).
  * `features/` – feature modules (controller‑opener, kibana, snippets).
  * `services/` – data and messaging services (bookmark‑store, browser, message‑service).
  * `views/` – view components (bookmark‑list‑view).
- `shared/` – shared utilities and settings.

**When Updating**
* Run the verification script `scripts/validate‑structure.sh` to ensure AGENTS.md stays in sync with the repository.
* Update the `last_updated` date after any structural change.

