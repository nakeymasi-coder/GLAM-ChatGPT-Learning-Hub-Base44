// no-auth probe: deployed function returns its own "Sign in required" 401
const r1 = await fetch(`https://app.base44.com/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/markProjectReady`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: 'test' })
});
console.log('no-auth call ->', r1.status, (await r1.text()).slice(0, 200));
// signed-in call with fake id: function's own "Project not found" 404
const r2 = await fetch(`https://app.base44.com/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/markProjectReady`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + Deno.env.get('BASE44_ACCESS_TOKEN') }, body: JSON.stringify({ project_id: 'fake-id-123' })
});
console.log('fake-id call ->', r2.status, (await r2.text()).slice(0, 200));
// control: a function that definitely does not exist
const r3 = await fetch(`https://app.base44.com/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/definitelyNotAFunction123`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + Deno.env.get('BASE44_ACCESS_TOKEN') }, body: '{}'
});
console.log('nonexistent control ->', r3.status, (await r3.text()).slice(0, 200));
