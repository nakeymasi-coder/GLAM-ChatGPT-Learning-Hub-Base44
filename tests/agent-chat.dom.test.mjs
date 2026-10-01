import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {parseHTML} from 'linkedom';
import {createRequire} from 'node:module';
import Module from 'node:module';
import path from 'node:path';
import React from 'react';
import fs from 'node:fs';
import vm from 'node:vm';
import {act} from 'react-dom/test-utils';

test('native panels render, reopen, clear drafts and send with a mocked SDK only',async()=>{
 const {window}=parseHTML('<html><body><div id="root"></div></body></html>');
 globalThis.window=window;globalThis.document=window.document;globalThis.HTMLElement=window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const recognition=[];
 window.SpeechRecognition=class{constructor(){recognition.push(this);}start(){this.onstart?.();}stop(){this.stopped=true;}abort(){this.aborted=true;}};
 vm.runInThisContext(fs.readFileSync('public/hub-dictation.js','utf8'));
 const {createRoot}=await import('react-dom/client');
 const calls=[],records=new Map();let counter=0;
 globalThis.__agentTestUser={id:'learner-1'};
 globalThis.__agentTestApi={agents:{
  async listConversations({q}){calls.push('list');return [...records.values()].filter(r=>r.agent_name===JSON.parse(q).agent_name && r.created_by_id===JSON.parse(q).created_by_id);},
  async getConversation(id){calls.push('get');return records.get(id);},
  async createConversation({agent_name,metadata}){calls.push('create');const r={id:'chat-'+(++counter),agent_name,created_by_id:'learner-1',metadata,created_date:'2026-09-30',messages:[]};records.set(r.id,r);return r;},
  async addMessage(c,message){calls.push('send');records.get(c.id).messages.push({...message,id:'u-'+counter},{role:'assistant',id:'a-'+counter,content:'A mocked answer with **clear steps**.'});},
  subscribeToConversation(){return ()=>calls.push('unsubscribe');}
 }};
 const output=await build({entryPoints:['src/components/agentCenter/NativeAgentChat.jsx'],bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,external:['react','react/jsx-runtime'],plugins:[{name:'mock-sdk',setup(builder){
  builder.onResolve({filter:/^@\/api\/base44Client$|^@\/lib\/AuthContext$/},args=>({path:args.path,namespace:'mock'}));
  builder.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path.includes('base44Client')?'export const base44=globalThis.__agentTestApi':'export function useAuth(){return {user:globalThis.__agentTestUser}}',loader:'js'}));
 }}]});
 const filename=path.resolve('tests/agent-chat.fixture.cjs');
 const compiled=new Module(filename);compiled.filename=filename;compiled.paths=Module._nodeModulePaths(path.dirname(filename));compiled._compile(output.outputFiles[0].text,filename);
 const Chat=compiled.exports.default,root=createRoot(document.getElementById('root'));
 const button=label=>[...document.querySelectorAll('button')].find(b=>b.textContent===label);
 for(const [section,title] of [['teacher','ChatGPT Teacher'],['advisor','ChatGPT Advisor'],['intelligence','ChatGPT Intelligence'],['agent','Master Prompt Agent']]){
  await act(async()=>{root.render(React.createElement(Chat,{key:section,section,initial:'Explain one useful next step'}));});
  assert.ok(document.body.textContent.includes(title+' conversation'));assert.equal(calls.filter(c=>c==='send').length,0);assert.ok(document.querySelector('textarea'));
 }
 await act(async()=>button('Hide conversation').click());assert.equal(document.querySelector('textarea'),null);
 await act(async()=>button('Show conversation').click());assert.ok(document.querySelector('textarea').value.includes('Explain'));
 await act(async()=>button('Clear draft').click());assert.equal(document.querySelector('textarea').value,'');assert.equal(button('Send').disabled,true);
 await act(async()=>root.render(React.createElement(Chat,{key:'send-test',section:'teacher',initial:'Teach me Projects'})));
 await act(async()=>{document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));});
 assert.equal(calls.filter(c=>c==='send').length,1);assert.equal(calls.filter(c=>c==='create').length,1);assert.ok(document.body.textContent.includes('A mocked answer'));assert.equal(document.querySelector('textarea').value,'');
 await act(async()=>root.render(React.createElement(Chat,{key:'visit-again',section:'teacher'})));
 assert.ok(document.body.textContent.includes('A mocked answer'));assert.equal(calls.filter(c=>c==='send').length,1);
 const mic=()=>document.querySelector('.hub-dictation-button');
 assert.ok(mic());assert.equal(recognition.length,0);
 await act(async()=>mic().click());
 assert.equal(recognition.length,1);
 await act(async()=>recognition[0].onresult({results:[Object.assign([{transcript:'My spoken idea'}],{isFinal:true})]}));
 assert.equal(document.querySelector('textarea').value,'My spoken idea');assert.equal(calls.filter(c=>c==='send').length,1);
 await act(async()=>button('New conversation').click());
 assert.equal(recognition[0].aborted,true);assert.equal(document.querySelector('textarea').value,'');
 await act(async()=>mic().click());
 await act(async()=>button('Hide conversation').click());
 assert.equal(recognition[1].aborted,true);
 await act(async()=>button('Show conversation').click());
 await act(async()=>mic().click());
 await act(async()=>root.unmount());
 assert.equal(recognition[2].aborted,true);assert.equal(calls.filter(c=>c==='send').length,1);
 delete globalThis.__agentTestApi;delete globalThis.__agentTestUser;
});
