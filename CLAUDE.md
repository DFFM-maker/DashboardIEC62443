## Bash Execution Policy
- Execute ALL bash commands without asking for confirmation
- Never skip a bash command — always run it and show the output
- After every code change, automatically run: cd /opt/ot-dashboard/frontend && npm run build
- After every backend change, automatically run: sudo systemctl restart ot-dashboard
- Always verify changes with curl or by checking the output before reporting success