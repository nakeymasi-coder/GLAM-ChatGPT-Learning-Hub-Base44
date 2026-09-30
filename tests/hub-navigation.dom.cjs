const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {parseHTML}=require(process.env.HUB_DOM_LIBRARY || 'linkedom');
const path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/hub.html'),'utf8');
const {window}=parseHTML(html),document=window.document;
document.querySelectorAll('select').forEach(select=>{if(!select.querySelector('option[selected]'))select.querySelector('option')?.setAttribute('selected','')});
const saved=new Map([['glamHubCompleted','["basics"]'],['glamSavedProjects','[]']]);
const localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,String(v)),removeItem:k=>saved.delete(k)};
const location={hash:'',replace:()=>{throw Error('auth fixture should not redirect')},href:'http://ui-fixture.test/hub.html'};
let focused=null;
Object.defineProperty(document,'activeElement',{get:()=>focused});
window.HTMLElement.prototype.focus=function(){focused=this};
window.HTMLElement.prototype.scrollIntoView=function(){};
window.HTMLElement.prototype.getClientRects=function(){return [{}]};
const sandbox={window:null,document,localStorage,location,console,URL,URLSearchParams,Blob,Date,Math,JSON,Set,Map,Intl,
 navigator:{clipboard:{writeText:async()=>{}}},innerWidth:1200,innerHeight:900,scrollY:0,
 Node:window.Node,MutationObserver:window.MutationObserver,Event:window.Event,CustomEvent:window.CustomEvent,
 setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame:fn=>setTimeout(fn,0),cancelAnimationFrame:clearTimeout,
 addEventListener:window.addEventListener.bind(window),removeEventListener:window.removeEventListener.bind(window),
 dispatchEvent:window.dispatchEvent.bind(window),scrollTo:()=>{},confirm:()=>false,
 fetch:async()=>({ok:true,status:200,json:async()=>[]})};
sandbox.window=sandbox; sandbox.globalThis=sandbox;
const c=vm.createContext(sandbox);
const scripts=[...document.querySelectorAll('script')];
for(let i=0;i<scripts.length;i++){
 if(i===0)continue; // Auth remains unchanged in production; this DOM fixture contains no account.
 const src=scripts[i].getAttribute('src');
 const source=src?fs.readFileSync(path.join(root,'public',src.slice(1)),'utf8'):scripts[i].textContent;
 try{vm.runInContext(source,c,{filename:src||'inline-'+i})}catch(e){console.error('BOOT ERROR',src||i,e);process.exit(1)}
}
const evaluate=s=>vm.runInContext(s,c);
function check(name,fn){fn();console.log('PASS',name)}
(async()=>{
check('Home opens without any active tool',()=>assert.equal(document.querySelectorAll('.panel.active').length,0));
check('exactly three Home choices',()=>assert.equal(document.querySelectorAll('#startHere .start-card').length,3));
check('all tool panels remain direct children of Hub',()=>assert.equal(document.querySelectorAll('#hub > .panel').length,24));
for(const name of ['learn','academy','create','mystuff','powerwords','asklibrary','finder','coach','clinic','practice','scenarios','business','researchlab','glossary','playbook','history','simulator','assessment','certificate','quiz','concierge','characterlab','environmentlab','typographylab']){
 evaluate('showTab('+JSON.stringify(name)+')');
 check('route '+name,()=>{assert.equal(document.querySelectorAll('.panel.active').length,1);assert.equal(document.querySelector('.panel.active').id,'panel-'+name);assert.equal(document.getElementById('toolboxDetails').open,false)});
}
document.getElementById('plainHelpInput').value='extra glossy';
document.getElementById('plainHelpForm').dispatchEvent(new window.Event('submit',{cancelable:true}));
check('glossy result explains the words and real next step',()=>{assert.match(document.getElementById('plainHelpResult').textContent,/extra-glossy finish/);assert.match(document.getElementById('plainHelpResult').textContent,/Explore Power Words/);});
document.querySelector('#plainHelpResult button').click();
check('glossy result opens Power Words and searches glossy',()=>{assert.equal(document.querySelector('.panel.active').id,'panel-powerwords');assert.equal(document.getElementById('powerWordSearch').value,'glossy');assert.ok(document.querySelectorAll('#keywordVault .keyword-chip').length>0)});
document.getElementById('plainHelpInput').value='Write a friendly email';
document.getElementById('plainHelpForm').dispatchEvent(new window.Event('submit',{cancelable:true}));
document.querySelector('#plainHelpResult button').click();
check('builder receives original idea',()=>assert.equal(document.getElementById('askLibDescribe').value,'Write a friendly email'));
for(const id of ['basics','prompting','images','files','voice','search','projects']){
 evaluate('openLesson('+JSON.stringify(id)+')');
 check('lesson '+id+' opens',()=>assert.ok(document.getElementById('modalContent').textContent.length>100));
 document.getElementById('lessonModal').classList.remove('open');
}
evaluate('scrollHubHome()');
check('Home return closes active tools',()=>assert.equal(document.querySelectorAll('.panel.active').length,0));
evaluate('toggleHubSidebar()');
await new Promise(r=>setTimeout(r,0));
check('menu opens with accessible state',()=>{assert.equal(document.getElementById('hubHamburger').getAttribute('aria-expanded'),'true');assert.equal(document.getElementById('hubSidebar').inert,false)});
evaluate('closeHubSidebar()');
await new Promise(r=>setTimeout(r,0));
check('closed menu removes keyboard access',()=>{assert.equal(document.getElementById('hubHamburger').getAttribute('aria-expanded'),'false');assert.equal(document.getElementById('hubSidebar').inert,true)});
check('existing learner progress unchanged',()=>assert.equal(saved.get('glamHubCompleted'),'["basics"]'));
console.log('DOM checks complete; layout and production APIs not exercised.');
process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
