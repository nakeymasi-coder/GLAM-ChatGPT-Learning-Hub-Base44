const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{parseHTML}=require('linkedom');
const html=fs.readFileSync(path.join(__dirname,'../public/hub.html'),'utf8');
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
const auth=scripts.find(m=>m[2].includes('async function protectHub()'))[2];
const storageSource=fs.readFileSync(path.join(__dirname,'../public/hub-storage.js'),'utf8');
const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('real deferred Hub boot waits for account and DOM, never loads legacy values, and freezes on account change',async(t)=>{
 const {window}=parseHTML(html),document=window.document;let ready='loading';Object.defineProperty(document,'readyState',{get:()=>ready});
 document.querySelectorAll('select').forEach(select=>{if(!select.querySelector('option[selected]'))select.querySelector('option')?.setAttribute('selected','')});
 const accountKey='glamHub:v2:6a9aedd33cd938f0f47b9ff7:A';
 const saved=new Map([['base44_access_token','A-token'],['glamPlaybook','LEGACY PRIVATE CONTENT'],['glamHubCompleted','["legacy"]'],[accountKey,JSON.stringify({version:2,appId:'6a9aedd33cd938f0f47b9ff7',ownerId:'A',data:{glamHubCompleted:'["basics"]',glamPlaybook:'[{"id":"mine","title":"A saved prompt","content":"Account A content"}]',glamHubTutorialSeen:'1'}})]]);
 const before=JSON.stringify([...saved]),localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,String(v)),removeItem:k=>saved.delete(k)};
 let resolveIdentity;const identityGate=new Promise(resolve=>{resolveIdentity=resolve;});let first=true,reloads=0;const requests=[],timers=[];
 const location={origin:'https://chatgpt-learning-hub.com',href:'https://chatgpt-learning-hub.com/hub.html',pathname:'/hub.html',hash:'',reload:()=>reloads++,replace:()=>{throw Error('Unexpected redirect');}};
 let focused=null;Object.defineProperty(document,'activeElement',{get:()=>focused});window.HTMLElement.prototype.focus=function(){focused=this;};window.HTMLElement.prototype.scrollIntoView=function(){};window.HTMLElement.prototype.getClientRects=function(){return [{}];};
 const sandbox={document,localStorage,location,console,URL,URLSearchParams,Blob,Date,Math,JSON,Set,Map,Intl,Promise,Array,
 navigator:{clipboard:{writeText:async()=>{}}},innerWidth:1200,innerHeight:900,scrollY:0,Node:window.Node,MutationObserver:window.MutationObserver,Event:window.Event,CustomEvent:window.CustomEvent,
 setTimeout:(fn,ms)=>{const id=setTimeout(fn,ms);timers.push(id);id.unref();return id;},clearTimeout,setInterval:()=>0,clearInterval,requestAnimationFrame:fn=>{const id=setTimeout(fn,0);timers.push(id);id.unref();return id;},cancelAnimationFrame:clearTimeout,
 addEventListener:window.addEventListener.bind(window),removeEventListener:window.removeEventListener.bind(window),dispatchEvent:window.dispatchEvent.bind(window),scrollTo:()=>{},confirm:()=>false,
 fetch:async(url,options={})=>{requests.push({url,options});if(String(url).includes('/User/me')){if(first){first=false;await identityGate;}return {ok:true,status:200,json:async()=>({id:'A',email:'a@example.test',role:'user'})};}if(String(url).includes('/LegalAcceptance'))return {ok:true,status:200,json:async()=>[{terms_version:'2026-09-07',privacy_version:'2026-09-07'}]};return {ok:true,status:200,json:async()=>[]};}};
 t.after(()=>timers.forEach(clearTimeout));
 sandbox.window=sandbox;sandbox.globalThis=sandbox;const c=vm.createContext(sandbox);
 const append=document.body.appendChild.bind(document.body);
 document.body.appendChild=function(node){const result=append(node);if(node.tagName==='SCRIPT'&&!node.hasAttribute('data-hub-deferred')){if(node.src){try{vm.runInContext(fs.readFileSync(path.join(__dirname,'../public',node.src.replace(/^\//,'')),'utf8'),c,{filename:node.src});queueMicrotask(()=>node.onload?.());}catch(error){queueMicrotask(()=>node.onerror?.(error));}}else vm.runInContext(node.textContent,c,{filename:'deferred-inline'});}return result;};
 vm.runInContext(storageSource,c);const boot=vm.runInContext(auth,c);await turn();
 assert.equal(vm.runInContext('typeof lessons',c),'undefined');assert.equal(JSON.stringify([...saved]),before);assert.equal(document.documentElement.style.visibility,'hidden');
 resolveIdentity();await turn();assert.equal(vm.runInContext('typeof lessons',c),'undefined');assert.equal(JSON.stringify([...saved]),before);
 ready='complete';document.dispatchEvent(new window.Event('DOMContentLoaded'));await boot;await turn();
 assert.equal(document.documentElement.style.visibility,'visible');assert.equal(vm.runInContext('lessons.length',c),29);assert.equal(vm.runInContext('completed.includes("basics")',c),true);
 assert.ok(document.body.textContent.includes('A saved prompt'));assert.ok(!document.body.textContent.includes('LEGACY PRIVATE CONTENT'));assert.equal(saved.get('glamPlaybook'),'LEGACY PRIVATE CONTENT');
 assert.equal(saved.get('glamHubCompleted'),'["legacy"]');assert.ok(document.getElementById('hubLegacyNote'));assert.equal(document.getElementById('hubLegacyNote').hidden,false);
 assert.equal(requests.some(({url})=>/hubAi|netlify.*(?:coach|ask)/.test(url)),false);
 const input=document.getElementById('hubImportBackupFile'),consent=document.getElementById('hubImportConfirm'),apply=document.getElementById('hubImportApply');
 const originalAccount=saved.get(accountKey);
 const wrong=JSON.stringify({format:'glam-hub-account-backup',version:1,appId:'6a9aedd33cd938f0f47b9ff7',ownerId:'B',data:{glamPlaybookNotes:'B secret'}});
 Object.defineProperty(input,'files',{configurable:true,value:[{size:wrong.length,text:async()=>wrong}]});await input.onchange();assert.ok(document.getElementById('hubImportStatus').textContent.includes('different account'));assert.equal(apply.disabled,true);assert.ok(!document.getElementById('hubImportPreview').textContent.includes('B secret'));
 const own=JSON.stringify({format:'glam-hub-account-backup',version:1,appId:'6a9aedd33cd938f0f47b9ff7',ownerId:'A',data:{glamPlaybookNotes:'My imported notes',glamHubCompleted:'[\"files\"]'}});
 Object.defineProperty(input,'files',{configurable:true,value:[{size:own.length,text:async()=>own}]});await input.onchange();assert.equal(apply.disabled,true);assert.ok(document.getElementById('hubImportPreview').textContent.includes('keep current'));
 document.getElementById('hubImportCancel').onclick();assert.equal(saved.get(accountKey),originalAccount);
 Object.defineProperty(input,'files',{configurable:true,value:[{size:own.length,text:async()=>own}]});await input.onchange();consent.checked=true;consent.onchange();assert.equal(apply.disabled,false);apply.onclick();assert.equal(c.HubStorage.getItem('glamPlaybookNotes'),'My imported notes');assert.equal(c.HubStorage.getItem('glamHubCompleted'),'[\"basics\"]');assert.equal(reloads,1);reloads=0;
 saved.set('base44_access_token','B-token');const event=new window.Event('storage');event.key='base44_access_token';window.dispatchEvent(event);
 assert.equal(reloads,1);assert.equal(document.documentElement.style.visibility,'hidden');assert.throws(()=>c.HubStorage.setItem('glamPlaybookNotes','late'),/verified/);
 timers.forEach(clearTimeout);
});
test('unauthenticated bootstrap redirects without activating storage or learner scripts',async()=>{
 let redirect;const c=vm.createContext({document:{documentElement:{style:{}}},window:{location:{replace:url=>redirect=url}},localStorage:{getItem:()=>null}});
 await vm.runInContext(auth,c);assert.equal(redirect,'/login?returnTo=%2Fhub.html');assert.equal(vm.runInContext('typeof lessons',c),'undefined');
});
