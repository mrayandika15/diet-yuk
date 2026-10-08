#!/usr/bin/env bash
set -euo pipefail
server="${1:-opencraft}"
base="$(cd "$(dirname "$0")" && pwd)"
ssh "$server" 'mkdir -p ~/.local/share/diet-yuk ~/.config/diet-yuk ~/.config/systemd/user; chmod 700 ~/.config/diet-yuk'
# Supply an ignored, private env file on initial installation only.
if [[ -n "${DIET_YUK_WORKER_ENV_FILE:-}" ]]; then
  scp "$DIET_YUK_WORKER_ENV_FILE" "$server:.config/diet-yuk/ai-worker.env"
fi
ssh "$server" 'test -f ~/.config/diet-yuk/ai-worker.env; chmod 600 ~/.config/diet-yuk/ai-worker.env'
scp "$base/ai-worker.py" "$server:.local/share/diet-yuk/ai-worker.py"
scp "$base/diet-yuk-ai-worker.service" "$server:.config/systemd/user/diet-yuk-ai-worker.service"
ssh "$server" 'systemctl --user daemon-reload; systemctl --user enable --now diet-yuk-ai-worker.service; systemctl --user restart diet-yuk-ai-worker.service; systemctl --user is-active diet-yuk-ai-worker.service'
