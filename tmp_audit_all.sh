#!/bin/bash
node - << 'NODEEOF'
const fs = require('fs');
const auth = JSON.parse(fs.readFileSync(process.env.HOME + '/.base44/auth/auth.json','utf8'));
const TOKEN = auth.accessToken;
const APP = '6a9aedd33cd938f0f47b9ff7';
(async () => {
  const sk = await (await fetch(`https://app.base44.com/api/apps/${APP}/agent-skills`, { headers: { Authorization: 'Bearer ' + TOKEN } })).json();
  const ag = await (await fetch(`https://app.base44.com/api/apps/${APP}/agent-configs`, { headers: { Authorization: 'Bearer ' + TOKEN } })).json();
  console.log('TOTAL AGENTS:', ag.total, '| TOTAL SKILLS:', sk.total);
  for (const a of ag.items.sort((x,y)=>x.name.localeCompare(y.name))) {
    const skills = a.selected_skill_names || [];
    const missing = skills.filter(n => !sk.items.some(s => s.name === n));
    const m = a.memory_config || {};
    console.log('---');
    console.log('AGENT:', a.name);
    console.log('  skills:', skills.length ? skills.join(', ') : '(none)');
    console.log('  skills available:', missing.length === 0 ? 'YES (all resolve in library)' : 'NO - missing: ' + missing.join(', '));
    console.log('  memory: enabled=' + m.enabled + ', scope=' + m.scope + (m.retention_days ? ', retention=' + m.retention_days + 'd' : ''));
    console.log('  whatsapp:', a.whatsapp_greeting || 'not set', '| telegram:', a.telegram_greeting || 'not set');
  }
})().catch(e => console.log('ERROR:', e.message));
NODEEOF
