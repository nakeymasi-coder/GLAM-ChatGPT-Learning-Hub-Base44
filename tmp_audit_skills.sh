#!/bin/bash
set -e
TOKEN=$(node -e "const a=JSON.parse(require('fs').readFileSync(process.env.HOME+'/.base44/auth/auth.json','utf8'));process.stdout.write(a.accessToken)")
echo "=== LIVE AGENT-SKILLS LIBRARY ==="
curl -s -H "Authorization: Bearer $TOKEN" "https://app.base44.com/api/apps/6a9aedd33cd938f0f47b9ff7/agent-skills"
echo
echo "=== LIVE AGENTS (names only) ==="
curl -s -H "Authorization: Bearer $TOKEN" "https://app.base44.com/api/apps/6a9aedd33cd938f0f47b9ff7/agents" | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{try{const d=JSON.parse(s);const items=d.items||d;console.log('total:',d.total??(items.length||'?'));for(const a of items)console.log('-',(a.name), '| skills:', JSON.stringify(a.selected_skill_names||null))}catch(e){console.log(s.slice(0,800))}})"
