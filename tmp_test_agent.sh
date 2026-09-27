#!/bin/bash
set -e
node - << 'NODEEOF'
const fs = require('fs');
const auth = JSON.parse(fs.readFileSync(process.env.HOME + '/.base44/auth/auth.json','utf8'));
const TOKEN = auth.accessToken;
const APP = '6a9aedd33cd938f0f47b9ff7';
const BASE = `https://app.base44.com/api/apps/${APP}/agents`;
const H = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };
(async () => {
  // create conversation
  let r = await fetch(`${BASE}/conversations`, { method: 'POST', headers: H, body: JSON.stringify({ agent_name: 'chatgpt_teacher', metadata: { name: 'Agent skill fix verification', description: 'Post-fix smoke test' } }) });
  const txt = await r.text();
  console.log('createConversation:', r.status, r.ok ? 'OK' : txt.slice(0,400));
  if (!r.ok) return;
  const conv = JSON.parse(txt);
  const cid = conv.id || (conv.conversation && conv.conversation.id);
  console.log('conversation id:', cid);
  // send test message
  r = await fetch(`${BASE}/conversations/v2/${cid}/messages`, { method: 'POST', headers: H, body: JSON.stringify({ role: 'user', content: 'Teach me when I should use Work instead of regular Chat.' }) });
  console.log('addMessage:', r.status, (await r.text()).slice(0,300));
  // poll for assistant reply
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    await new Promise(res => setTimeout(res, 8000));
    const g = await fetch(`${BASE}/conversations/${cid}`, { headers: H });
    if (!g.ok) { console.log('poll GET failed:', g.status); continue; }
    const cd = await g.json();
    const msgs = cd.messages || (cd.conversation && cd.conversation.messages) || [];
    const asst = msgs.filter(m => m.role === 'assistant' && (m.content||'').trim());
    console.log('poll t+' + Math.round((Date.now()-t0)/1000) + 's: msgs=' + msgs.length + ' assistant=' + asst.length);
    if (asst.length > 0) { console.log('ASSISTANT REPLY:'); console.log(asst[asst.length-1].content.slice(0, 900)); return; }
  }
  console.log('TIMEOUT waiting for assistant reply');
})().catch(e => console.log('ERROR:', e.message));
NODEEOF
