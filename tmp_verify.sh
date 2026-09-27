#!/bin/bash
set -e
node - << 'NODEEOF'
const fs = require('fs');
const auth = JSON.parse(fs.readFileSync(process.env.HOME + '/.base44/auth/auth.json','utf8'));
const TOKEN = auth.accessToken;
const APP = '6a9aedd33cd938f0f47b9ff7';
(async () => {
  const sk = await (await fetch(`https://app.base44.com/api/apps/${APP}/agent-skills`, { headers: { Authorization: 'Bearer ' + TOKEN } })).json();
  console.log('SKILL LIBRARY total:', sk.total);
  for (const it of sk.items) console.log(' -', it.name);
  const ag = await (await fetch(`https://app.base44.com/api/apps/${APP}/agent-configs`, { headers: { Authorization: 'Bearer ' + TOKEN } })).json();
  console.log('AGENTS total:', ag.total, '| names:', ag.items.map(a => a.name).sort().join(', '));
  const wanted = ['chatgpt_teacher','chatgpt_advisor','chatgpt_intelligence','master_prompt_agent'];
  for (const name of wanted) {
    const a = ag.items.find(x => x.name === name);
    console.log(name, '| skills:', JSON.stringify(a.selected_skill_names), '| skills all available:', a.selected_skill_names.every(n => sk.items.some(s => s.name === n)), '| memory:', a.memory_config.enabled, '| whatsapp:', a.whatsapp_greeting, '| telegram:', a.telegram_greeting);
  }
})().catch(e => console.log('ERROR:', e.message));
NODEEOF
