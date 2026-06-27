#!/bin/bash
# Run THIS on the OTHER computer to tunnel to the server machine.
# Twitch embeds only work when the page is served from "localhost".
# This tunnel makes the server's port 8080 appear as localhost:8080
# on the remote computer.
#
# Usage:
#   1. Start the server on the main machine:
#      python3 server.py 8080
#
#   2. Find the main machine's LAN IP:
#      ipconfig getifaddr en0   (macOS)
#      hostname -I              (Linux)
#
#   3. Run this script on the OTHER computer:
#      ./tunnel.sh 192.168.1.10
#
#   4. Open http://localhost:8080/ on the other computer

if [ -z "$1" ]; then
  echo "Usage: $0 <server-ip>"
  echo "Example: $0 192.168.1.10"
  exit 1
fi

echo "→ Tunneling localhost:8080 → $1:8080"
echo "→ Open http://localhost:8080 on this machine"
echo ""
ssh -L 8080:localhost:8080 "$1" -N
