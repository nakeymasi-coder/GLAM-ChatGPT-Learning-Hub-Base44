#!/bin/bash
set -e
node - << 'NODEEOF'
const fs = require('fs');
const auth = JSON.parse(fs.readFileSync(process.env.HOME + '/.base44/auth/auth.json','utf8'));
const TOKEN = auth.accessToken;
const APP = '6a9aedd33cd938f0f47b9ff7';
const CID = '6ab982dd749c77c10a4b8bff';
const candidates = [
  ['GET',  `https://app.base44.com/api/apps/${APP}/agent-conversations`],
  ['GET',  `https://app.base44.com/api/apps/${APP}/agent-conversations/${CID}`],
  ['DELETE', `https://app.base44.com/api/apps/${APP}/agent-conversations/${CID}`],
  ['GET',  `https://app.base44.com/api/apps/${APP}/conversations`],
  ['DELETE', `https://app.base44.com/api/apps/${APP}/conversations/${CID}`],
  ['DELETE', `https://app.base44.com/api/conversations/${CID}`],
  ['GET',  `https://app.base44.com/api/apps/${APP}/agents/conversations`],
  ['DELETE', `https://app.base44.com/api/apps/${APP}/agents/conversations/v2/${CID}`],
  ['POST', `https://app.base44.com/api/apps/${APP}/agents/conversations/${CID}/archive`],
];
(async () => {
  for (const [m, url] of candidates) {
    try {
      const r = await fetch(url, { method: m, headers: { 'Authorization': 'Bearer ' + TOKEN } });
      const txt = await r.text();
      console.log(m, url.replace('https://app.base44.com/api',''), '->', r.status, txt.slice(0,120).replace(/\n/g,' '));
    } catch (e) { console.log(m, url, 'ERR', e.message); }
  }
})();
NODEEOF
