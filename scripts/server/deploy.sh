#!/usr/bin/env bash
# Explicit deployment command. Does not run during app install/build.
set -euo pipefail
server="${1:-opencraft}"
base="$(cd "$(dirname "$0")" && pwd)"
ssh "$server" 'mkdir -p ~/.local/share/diet-yuk ~/.config/systemd/user'
scp "$base/gateway.py" "$server:.local/share/diet-yuk/gateway.py"
scp "$base/diet-yuk-api.service" "$server:.config/systemd/user/diet-yuk-api.service"
ssh "$server" 'systemctl --user daemon-reload && systemctl --user enable --now diet-yuk-api.service && systemctl --user restart diet-yuk-api.service'
# Domain routing is configured separately after credentials are provided.
echo 'Gateway installed on VPS loopback port 8643. Route your HTTPS tunnel to that port.'
