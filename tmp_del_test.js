const token = Deno.env.get('BASE44_ACCESS_TOKEN');
const appId = Deno.env.get('BASE44_APP_ID');
const base = `https://app.base44.com/api/apps/${appId}/agents`;
const H = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
(async () => {
  const agents = ['chatgpt_teacher','chatgpt_advisor','chatgpt_intelligence','master_prompt_agent'];
  const targets = [];
  for (const a of agents) {
    const r = await fetch(`${base}/conversations?agent_name=${a}`, { headers: H });
    const d = await r.json();
    const items = Array.isArray(d) ? d : (d.conversations || d.items || []);
    for (const c of items) {
      if ((c.metadata && (c.metadata.name === 'Skill fix verification' || String(c.metadata.description||'').startsWith('post-fix smoke test'))) || (c.name === 'Skill fix verification')) {
        targets.push({ id: c.id, agent: a });
      }
    }
  }
  console.log('found test conversations:', targets.length);
  for (const t of targets) {
    const r = await fetch(`${base}/conversations/${t.id}`, { method: 'DELETE', headers: H });
    console.log('DELETE', t.id, '(' + t.agent + ') ->', r.status, r.ok ? 'OK' : (await r.text()).slice(0,200));
  }
  // verify
  for (const a of agents) {
    const r = await fetch(`${base}/conversations?agent_name=${a}`, { headers: H });
    const d = await r.json();
    const items = Array.isArray(d) ? d : (d.conversations || d.items || []);
    const left = items.filter(c => (c.metadata && (c.metadata.name === 'Skill fix verification' || String(c.metadata.description||'').startsWith('post-fix smoke test'))) || (c.name === 'Skill fix verification'));
    console.log('remaining test conversations for', a, ':', left.length);
  }
})().catch(e => console.log('ERROR:', e.message));
