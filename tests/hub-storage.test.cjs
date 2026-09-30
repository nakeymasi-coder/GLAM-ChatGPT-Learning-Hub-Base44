const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/hub-storage.js'),'utf8');
const moduleBox={exports:{}};vm.runInNewContext(source,{module:moduleBox});const {createStore,appId,labels}=moduleBox.exports;
function fixture(){const saved=new Map(),storage={getItem:k=>saved.has(k)?saved.get(k):null,setItem:(k,v)=>saved.set(k,String(v)),removeItem:k=>saved.delete(k)};let token='A-session',invalidated=0;
 return {saved,storage,setToken:t=>{token=t;},get invalidated(){return invalidated;},session:id=>{const store=createStore(storage,{tokenReader:()=>token,onInvalid:()=>invalidated++});if(id)store.activate(id,token);return store;}};
}
function backup(ownerId,data,extra={}){return JSON.stringify({format:'glam-hub-account-backup',version:1,appId,ownerId,sourceOrigin:'https://chatgpt-learning-hub.base44.app',data,...extra});}
test('A to B to A isolates every learner key and preserves original browser data',()=>{
 const f=fixture();f.saved.set('glamPlaybook','legacy private prompts');const old=JSON.stringify([...f.saved]);
 const a=f.session('A');for(const key of Object.keys(labels))a.setItem(key,'A:'+key);
 f.setToken('B-session');const b=f.session('B');for(const key of Object.keys(labels)){assert.equal(b.getItem(key),null);b.setItem(key,'B:'+key);}
 f.setToken('A-new-session');const a2=f.session('A');for(const key of Object.keys(labels))assert.equal(a2.getItem(key),'A:'+key);
 assert.equal(f.saved.get('glamPlaybook'),'legacy private prompts');assert.equal(old,JSON.stringify([['glamPlaybook','legacy private prompts']]));
});
test('loading identity cannot read, write, remove, export or import saves',()=>{
 const f=fixture(),s=f.session();for(const fn of [()=>s.getItem('glamPlaybook'),()=>s.setItem('glamPlaybook','[]'),()=>s.removeItem('glamPlaybook'),()=>s.exportBackup('x'),()=>s.previewImport('{}')])assert.throws(fn,/verified/);
 assert.equal(f.saved.size,0);
});
test('logout and account switch block stale asynchronous writes without touching data',()=>{
 const f=fixture(),a=f.session('A');a.setItem('glamPlaybookNotes','keep A');const before=JSON.stringify([...f.saved]);f.setToken(null);
 assert.throws(()=>a.setItem('glamPlaybookNotes','late request'),/changed/);assert.equal(JSON.stringify([...f.saved]),before);assert.equal(f.invalidated,1);
 f.setToken('B-session');assert.throws(()=>a.getItem('glamPlaybookNotes'),/verified/);const b=f.session('B');assert.equal(b.getItem('glamPlaybookNotes'),null);
});
test('an active page cannot silently rebind its state to another account',()=>{
 const f=fixture(),s=f.session('A');s.setItem('glamPlaybookNotes','A');assert.throws(()=>s.activate('B','A-session'),/Reload/);assert.throws(()=>s.setItem('glamPlaybookNotes','B'),/verified/);
});
test('legacy keys are detected without exposing, importing or erasing values',()=>{
 const f=fixture();for(const key of Object.keys(labels))f.saved.set(key,'secret '+key);const before=JSON.stringify([...f.saved]),s=f.session('B');
 assert.equal(s.hasLegacy(),true);for(const key of Object.keys(labels))assert.equal(s.getItem(key),null);
 assert.equal(Object.keys(JSON.parse(s.exportBackup('new.example')).data).length,0);assert.equal(JSON.stringify([...f.saved]),before);
});
test('backup import requires owner label match and explicit confirmation',()=>{
 const f=fixture(),s=f.session('A');assert.throws(()=>s.previewImport(backup('B',{glamPlaybookNotes:'B private'})),/different account/);
 assert.throws(()=>s.previewImport(JSON.stringify({glamPlaybookNotes:'unidentified'})),/account-identified/);
 assert.throws(()=>s.importBackup(backup('A',{glamPlaybookNotes:'A note'}),false),/Confirm/);assert.equal(s.getItem('glamPlaybookNotes'),null);
});
test('import keeps conflicting current data and copies only missing categories',()=>{
 const f=fixture(),s=f.session('A');s.setItem('glamHubCompleted','["basics"]');s.setItem('glamPlaybookNotes','current');
 const file=backup('A',{glamHubCompleted:'["files"]',glamPlaybookNotes:'older',glamCertificateName:'Learner'});
 const preview=s.previewImport(file);assert.equal(preview.items.filter(x=>x.status==='keep-current').length,2);
 const result=s.importBackup(file,true);assert.equal(result.copied.length,1);assert.equal(result.skipped.length,2);
 assert.equal(s.getItem('glamHubCompleted'),'["basics"]');assert.equal(s.getItem('glamPlaybookNotes'),'current');assert.equal(s.getItem('glamCertificateName'),'Learner');
});
test('identical backup is a no-op and cancellation leaves current and legacy untouched',()=>{
 const f=fixture(),s=f.session('A');f.saved.set('glamHubCompleted','["legacy"]');s.setItem('glamPlaybookNotes','same');
 const file=backup('A',{glamPlaybookNotes:'same'}),before=JSON.stringify([...f.saved]);assert.equal(s.previewImport(file).items[0].status,'same');
 assert.equal(JSON.stringify([...f.saved]),before);assert.equal(s.importBackup(file,true).copied.length,0);assert.equal(JSON.stringify([...f.saved]),before);
});
test('a concurrent save between preview and confirmation is never overwritten',()=>{
 const f=fixture(),s=f.session('A'),file=backup('A',{glamPlaybookNotes:'from file'});assert.equal(s.previewImport(file).items[0].status,'copy');
 s.setItem('glamPlaybookNotes','newly saved');assert.equal(s.importBackup(file,true).copied.length,0);assert.equal(s.getItem('glamPlaybookNotes'),'newly saved');
});
test('malformed current storage fails closed instead of resetting progress',()=>{
 const f=fixture();f.saved.set('glamHub:v2:'+appId+':A','{broken');const before=JSON.stringify([...f.saved]);assert.throws(()=>f.session('A'),/preserved/);assert.equal(JSON.stringify([...f.saved]),before);
});
test('a quota failure during import leaves the existing account document unchanged',()=>{
 const f=fixture(),s=f.session('A');s.setItem('glamPlaybookNotes','keep');const before=JSON.stringify([...f.saved]);f.storage.setItem=()=>{throw Error('QuotaExceeded');};
 assert.throws(()=>s.importBackup(backup('A',{glamCertificateName:'Name'}),true),/Quota/);assert.equal(JSON.stringify([...f.saved]),before);
});
test('invalid backups, unsupported auth fields and malformed values are rejected',()=>{
 const f=fixture(),s=f.session('A');for(const file of [backup('A',{token:'secret'}),backup('A',{glamHubCompleted:'"bad"'}),backup('A',{glamPlaybook:'[{}]'}),backup('A',{glamFinalAssessment:'{"score":999,"correct":99}'}),backup('A',{glamPlaybookNotes:10}),backup('A',{}, {appId:'other'})])assert.throws(()=>s.previewImport(file));
 assert.equal(f.saved.size,0);
});
test('account backups can move origins with explicit import but omit authentication and legacy data',()=>{
 const f=fixture(),s=f.session('A');f.saved.set('token','private token');f.saved.set('glamPlaybookNotes','unidentified');s.setItem('glamPlaybookNotes','my note');s.setItem('glamSavedProjects','[{"private":"cache"}]');
 const file=s.exportBackup('https://chatgpt-learning-hub.base44.app');assert.ok(!file.includes('private token'));assert.ok(!file.includes('unidentified'));assert.ok(!file.includes('cache'));
 const fresh=fixture(),target=fresh.session('A');assert.equal(target.getItem('glamPlaybookNotes'),null);target.importBackup(file,true);assert.equal(target.getItem('glamPlaybookNotes'),'my note');
});
test('all original learner storage calls are scoped; only auth uses raw localStorage',()=>{
 for(const file of ['public/hub.html','public/hub-projects.js']){const text=fs.readFileSync(path.join(__dirname,'..',file),'utf8');assert.doesNotMatch(text,/localStorage\.(getItem|setItem|removeItem)\(\s*(?:["']glam|ACTIVE_KEY|SAVED_KEY)/);}
 const html=fs.readFileSync(path.join(__dirname,'../public/hub.html'),'utf8');
 const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.filter(m=>!m[1].includes('data-hub-deferred')).length,2);
 assert.ok(scripts.slice(2).every(m=>m[1].includes('type="application/x-hub-deferred"')));
 const projects=fs.readFileSync(path.join(__dirname,'../public/hub-projects.js'),'utf8');assert.doesNotMatch(projects,/one-time migration|toEntityFields\(legacy/);
});

test('supplemental library and browser title are clearly distinct from the Academy',()=>{const teacher=fs.readFileSync(path.join(__dirname,'../src/components/agentCenter/Teacher.jsx'),'utf8');assert.ok(teacher.includes('Supplemental agent practice library'));assert.ok(teacher.includes('29-lesson Academy'));assert.ok(teacher.includes('does not change your course progress or certificate'));assert.ok(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').includes('<title>GLAM ChatGPT Learning Hub</title>'));});
