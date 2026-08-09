# Cursor Agent CLI (`cursor-agent` / `agent`)

Součást MA P3 (#103 / #114). CLI umožňuje `ma-run-role.sh` spouštět role mimo Task.

## Instalace (macOS / Linux / WSL)

```bash
curl https://cursor.com/install -fsS | bash
export PATH="$HOME/.local/bin:$PATH"
# trvale: přidej stejný export do ~/.bashrc nebo ~/.zshrc
```

Ověření:

```bash
command -v cursor-agent   # nebo: command -v agent
cursor-agent --version
cursor-agent --help
```

Oficiální docs: [cursor.com/docs/cli/installation](https://cursor.com/docs/cli/installation).

## Vazba na `ma-run-role.sh`

Skript volá:

```text
$CURSOR_AGENT_BIN -p --output-format text [--model <slug>] [--force] "<prompt>"
```

| Flag | Význam |
|------|--------|
| `-p` / `--print` | headless výstup |
| `--output-format text` | text (ne json) |
| `--model <slug>` | pin modelu; při `auto` se **nepředává** |
| `-f` / `--force` | zápis (`ma-run-role --write`) |

Default binarka: `cursor-agent` (symlink `agent` je totéž). Přepis: `CURSOR_AGENT_BIN=agent`.

## Preflight

```bash
bash docs/scripts/check-ma-env.sh
```

Chybí-li CLI: orchestrace `/m #N` používá **Task/subagent** (exit 3 ≠ STOP).
