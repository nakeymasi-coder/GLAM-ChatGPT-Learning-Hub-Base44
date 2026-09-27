#!/bin/bash
node - << 'NODEEOF'
const fs = require('fs');
const auth = JSON.parse(fs.readFileSync(process.env.HOME + '/.base44/auth/auth.json','utf8'));
const TOKEN = auth.accessToken;
const APP = '6a9aedd33cd938f0f47b9ff7';
(async () => {
  const sk = await (await fetch(`https://app.base44.com/api/apps/${APP}/agent-skills`, { headers: { Authorization: 'Bearer ' + TOKEN } })).json();
  console.log('SKILL LIBRARY:', sk.total, 'skills ->', sk.items.map(s => s.name).join(', '));
  const ag = await (await fetch(`https://app.base44.com/api/apps/${APP}/agent-configs`, { headers: { Authorization: 'Bearer ' + TOKEN } })).json();
  for (const name of ['chatgpt_teacher','chatgpt_advisor','chatgpt_intelligence','master_prompt_agent']) {
    const a = ag.items.find(x => x.name === name);
    const ok = a.selected_skill_names.every(n => sk.items.some(s => s.name === n));
    console.log(name + ':', a.selected_skill_names.join(', '), '-> all available:', ok);
  }
})().catch(e => console.log('ERROR:', e.message));
NODEEOF
