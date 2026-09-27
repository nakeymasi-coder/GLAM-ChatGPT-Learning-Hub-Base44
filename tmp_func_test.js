// safe live test: call markProjectReady on an existing project that is NOT ready
const projects = await base44.entities.HubProject.list({ limit: 5 });
console.log('projects visible:', Array.isArray(projects) ? projects.length : 'n/a', Array.isArray(projects) ? projects.map(p => ({id: p.id, status: p.status, ready_at: p.ready_at})).slice(0,3) : '');
const p = Array.isArray(projects) ? projects.find(x => x.status !== 'Ready to Use') || projects[0] : null;
if (!p) { console.log('no projects to test with'); }
else {
  const res = await fetch(`https://app.base44.com/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/markProjectReady`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + Deno.env.get('BASE44_ACCESS_TOKEN') },
    body: JSON.stringify({ project_id: p.id })
  });
  console.log('markProjectReady status:', res.status);
  console.log('response:', (await res.text()).slice(0, 300));
}
