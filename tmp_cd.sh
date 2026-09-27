#!/bin/bash
node - << 'NODEEOF'
const fs = require('fs');
const auth = JSON.parse(fs.readFileSync(process.env.HOME + '/.base44/auth/auth.json','utf8'));
const TOKEN = auth.accessToken;
const APP = '6a9aedd33cd938f0f47b9ff7';
(async () => {
  for (const p of ['/functions', '/deployments', '/']) {
    try {
      const r = await fetch(`https://app.base44.com/api/apps/${APP}${p}`, { headers: { Authorization: 'Bearer ' + TOKEN } });
      const txt = await r.text();
      console.log(p, '->', r.status, txt.slice(0, 400).replace(/\s+/g,' '));
    } catch (e) { console.log(p, 'ERR', e.message); }
  }
})().catch(e => console.log('ERROR:', e.message));
NODEEOF
