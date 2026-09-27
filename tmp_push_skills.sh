#!/bin/bash
set -e
TOKEN=$(node -e "const a=JSON.parse(require('fs').readFileSync(process.env.HOME+'/.base44/auth/auth.json','utf8'));process.stdout.write(a.accessToken)")
node - << 'NODEEOF'
const fs = require('fs');
const path = require('path');
const auth = JSON.parse(fs.readFileSync(process.env.HOME + '/.base44/auth/auth.json','utf8'));
const TOKEN = auth.accessToken;
const APP = '6a9aedd33cd938f0f47b9ff7';
const dir = '/app/base44/agent-skills';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
(async () => {
  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) { console.log('SKIP (no frontmatter):', f); continue; }
    // YAML plain-scalar folding for description
    const fm = m[1];
    const dmatch = fm.match(/^description:[ \t]*(.*)$/);
    let desc = dmatch ? dmatch[1] : '';
    if (!desc || desc.trim().endsWith('|') || desc.trim().endsWith('>') || desc.trim() === '|' || desc.trim() === '>') {
      // block or wrapped scalar: join following indented lines
      const lines = fm.split('\n');
      const di = lines.findIndex(l => l.startsWith('description:'));
      const parts = [];
      let j = di + 1;
      while (j < lines.length && (lines[j].startsWith('  ') || lines[j].startsWith('\t'))) { parts.push(lines[j].trim()); j++; }
      desc = [lines[di].replace(/^description:[ \t]*/, '').trim(), ...parts].filter(Boolean).join(' ');
    } else {
      const lines = fm.split('\n');
      const di = lines.findIndex(l => l.startsWith('description:'));
      let j = di + 1;
      while (j < lines.length && (lines[j].startsWith('  ') || lines[j].startsWith('\t'))) { desc += ' ' + lines[j].trim(); j++; }
    }
    const name = f.replace(/\.md$/, '');
    const body = m[2].trim();
    const res = await fetch(`https://app.base44.com/api/apps/${APP}/agent-skills`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc.trim(), body })
    });
    const txt = await res.text();
    console.log('PUSH', name, '->', res.status, res.ok ? 'OK' : txt.slice(0, 300));
  }
  // verify
  const v = await fetch(`https://app.base44.com/api/apps/${APP}/agent-skills`, { headers: { 'Authorization': 'Bearer ' + TOKEN } });
  const vd = await v.json();
  console.log('VERIFY library total:', vd.total);
  for (const it of (vd.items||[])) console.log(' -', it.name, '| desc len:', (it.description||'').length, '| body len:', (it.body||'').length);
})();
NODEEOF
