const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const html = fs.readFileSync(path.join(root,'public/hub.html'),'utf8');
const js = fs.readFileSync(path.join(root,'public/hub-navigation.js'),'utf8');
const context = vm.createContext({});
vm.runInContext(js,context);
const suggest = context.HubGuide.suggest;
const cases = [
 ['extra glossy','powerwords',null,'glossy'],
 ['Make it shiny','powerwords',null,'glossy'],
 ['soft image','powerwords',null,'soft'],
 ['I am brand new to ChatGPT',null,'basics'],
 ['help with a PDF',null,'files'],
 ['talk out loud',null,'voice'],
 ['search the web',null,'search'],
 ['make a flyer',null,'images'],
 ['write a better prompt','asklibrary'],
 ['find my saved work','mystuff'],
 ['where is my history','mystuff'],
 ['something unusual I do not know how to name','asklibrary'],
];
for (const [query,tab,lesson,search] of cases) test(query,()=>{
 const r=suggest(query);
 if(tab)assert.equal(r.tab,tab);
 if(lesson)assert.equal(r.lesson,lesson);
 if(search)assert.equal(r.search,search);
 assert.ok(r.action && r.description);
});
test('empty input has no invented result',()=>assert.equal(suggest('  '),null));
test('prompt builder preserves original words',()=>assert.equal(suggest('Write a friendly email').prefill,'Write a friendly email'));
test('finder is local and does not call AI or persistence',()=>{
 assert.doesNotMatch(js,/\bfetch\s*\(|localStorage\s*\.\s*(setItem|removeItem|clear)|functions\s*\.\s*invoke/);
});
test('all existing panel routes remain',()=>{
 for(const id of ['concierge','academy','create','asklibrary','finder','coach','characterlab','environmentlab','typographylab','powerwords','clinic','practice','scenarios','business','researchlab','glossary','playbook','mystuff','history','simulator','assessment','certificate','quiz'])
 assert.ok(html.includes('id="panel-'+id+'"'),id);
 assert.ok(html.includes('id="panel-learn"'));
});
test('home has exactly the three agreed paths',()=>{
 const home=html.slice(html.indexOf('class="start-here hub-welcome"'),html.indexOf('<section id="hub">'));
 assert.equal((home.match(/class="start-card"/g)||[]).length,3);
 for(const label of ['Learn ChatGPT','Make something','Find my saved work'])assert.ok(home.includes('<strong>'+label+'</strong>'));
});
test('tool directory stays closed when changing routes',()=>assert.ok(html.includes('if (tools) tools.open = false;')));
test('mobile destinations are consistent and have four controls',()=>{
 const nav=html.match(/<nav class="mobile-bottom-nav"[\s\S]*?<\/nav>/)[0];
 assert.equal((nav.match(/<button /g)||[]).length,4);
 assert.doesNotMatch(nav,/agent-center/);
});
test('all inline scripts parse',()=>{
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 scripts.forEach((match,i)=>new vm.Script(match[1],{filename:'hub-inline-'+i}));
});
test('learner storage and protected entry still exist',()=>{
 for(const key of ['glamHubCompleted','glamConciergeProject','glamSavedProjects'])assert.ok(html.includes(key));
 assert.ok(html.includes('async function protectHub()'));
 assert.ok(html.includes('entities/LegalAcceptance'));
});
