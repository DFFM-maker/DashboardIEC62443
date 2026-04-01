## Bash Execution Policy
- Execute ALL bash commands without asking for confirmation
- Never skip a bash command — always run it and show the output
- After every code change, automatically run: cd /opt/ot-dashboard/frontend && npm run build
- After every backend change, automatically run: sudo systemctl restart ot-dashboard
- Always verify changes with curl or by checking the output before reporting success

## Node.js — Versione corretta
Il progetto usa Node.js v22 via nvm (lts/jod). La versione è pinned come default nvm.

- `nvm use default` → v22.22.2 (corretto per better-sqlite3)
- `node --version` → deve mostrare v22.x.x
- Se mostra v24: esegui `nvm use default` prima di qualsiasi comando npm/node

Comandi:
- Test: `npm test`
- Server: `node server.js`
- Rebuild se necessario: `npm rebuild better-sqlite3`
