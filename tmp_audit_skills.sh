#!/bin/bash
set -e
TOKEN=$(node -e "const fs=require('fs');const a=JSON.parse(fs.readFileSync(process.env.HOME+'/.base44/auth','utf8'));process.stdout.write(a.accessToken||a.access_token||'')")
echo "=== LIVE AGENT-SKILLS LIBRARY ==="
curl -s -H "Authorization: Bearer $TOKEN" "https://app.base44.com/api/apps/6a9aedd33cd938f0f47b9ff7/agent-skills"
echo
echo "=== LIVE AGENTS LIST ==="
curl -s -H "Authorization: Bearer $TOKEN" "https://app.base44.com/api/apps/6a9aedd33cd938f0f47b9ff7/agents"
