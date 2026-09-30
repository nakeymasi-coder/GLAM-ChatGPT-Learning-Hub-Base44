import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAgentChatSession,belongsToAgent,visibleMessage} from '../src/components/agentCenter/agentChatSession.js';

const agentName='chatgpt_teacher',userId='learner-1';
const record=(id='chat-1',extra={})=>({id,agent_name:agentName,created_by_id:userId,metadata:{name:'Teacher'},messages:[],...extra});
function fixture(overrides={}) {
  const calls=[],rows=[record()];let update;let unsubscribed=0;let state;
  const agents={
    async listConversations(params){calls.push(['list',params]);return rows;},
    async getConversation(id){calls.push(['get',id]);return rows.find(row=>row.id===id);},
    async createConversation(params){calls.push(['create',params]);const row=record('new-'+rows.length);rows.unshift(row);return row;},
    async addMessage(conversation,message){calls.push(['send',conversation.id,message]);rows.find(row=>row.id===conversation.id).messages.push({...message,id:'message-1'});return message;},
    subscribeToConversation(id,listener){calls.push(['subscribe',id]);update=listener;return ()=>{unsubscribed++;};},
    ...overrides
  };
  const session=createAgentChatSession(agents,{agentName,userId,title:'Teacher',onChange:value=>{state=value;}});
  return {session,agents,calls,rows,get state(){return state;},emit:value=>update(value),get unsubscribed(){return unsubscribed;}};
}
test('opening restores saved chat with serialized owner query and makes zero AI writes',async()=>{
 const f=fixture();await f.session.open();assert.equal(f.state.conversation.id,'chat-1');
 assert.deepEqual(f.calls[0][1],{q:JSON.stringify({agent_name:agentName,created_by_id:userId}),sort:'-updated_date',limit:50});
 assert.equal(f.calls.filter(([name])=>['send','create'].includes(name)).length,0);f.session.dispose();
});
test('new chat and cancel/clear draft have no server writes until explicit Send',async()=>{
 const f=fixture();await f.session.open();f.session.newConversation();
 assert.equal(f.state.conversation,null);assert.equal(f.calls.some(([name])=>name==='create'),false);
 assert.equal(await f.session.send(''),false);assert.equal(await f.session.send('  Teach me Projects  '),true);
 assert.equal(f.calls.filter(([name])=>name==='create').length,1);assert.equal(f.calls.filter(([name])=>name==='send').length,1);
 assert.equal(f.state.messages[0].content,'Teach me Projects');f.session.dispose();
});
test('stored records for another agent or another user are never restored',async()=>{
 const f=fixture();f.rows.unshift(record('wrong-agent',{agent_name:'chatgpt_advisor'}),record('wrong-user',{created_by_id:'learner-2'}));
 await f.session.open();assert.equal(f.state.conversation.id,'chat-1');assert.equal(f.state.conversations.length,1);
 assert.equal(belongsToAgent(record(),agentName,'other'),false);f.session.dispose();
});
test('switching and reopening preserve stored conversations without duplicate sends',async()=>{
 const f=fixture();f.rows.push(record('chat-2'));await f.session.open('chat-2');await f.session.send('Follow up');await f.session.open('chat-1');await f.session.open('chat-2');
 assert.equal(f.state.messages[0].content,'Follow up');assert.equal(f.calls.filter(([name])=>name==='send').length,1);assert.ok(f.unsubscribed>=2);f.session.dispose();
});
test('synchronous send lock prevents double click duplicate messages',async()=>{
 let finish;const gate=new Promise(resolve=>{finish=resolve;});const f=fixture({async addMessage(){await gate;}});
 await f.session.open();const first=f.session.send('one');assert.equal(await f.session.send('two'),false);finish();await first;assert.equal(f.state.sending,false);f.session.dispose();
});
test('authentication load failure blocks send and has useful recovery text',async()=>{
 const f=fixture({async listConversations(){throw {status:401};}});await f.session.open();assert.match(f.state.error,/Sign in again/);assert.equal(f.state.ready,false);assert.equal(await f.session.send('blocked'),false);f.session.dispose();
});
test('failed send does not auto-retry and requires read-only recovery',async()=>{
 const f=fixture({async addMessage(){throw Error('Network paused');}});await f.session.open();assert.equal(await f.session.send('one'),false);
 assert.match(f.state.error,/may already have arrived/);assert.equal(f.state.reloadRequired,true);assert.equal(await f.session.send('one'),false);
 await f.session.open();assert.equal(f.state.reloadRequired,false);f.session.dispose();
});
test('leaving during load cancels stale UI updates and never creates a chat',async()=>{
 let finish;const f=fixture({listConversations:()=>new Promise(resolve=>{finish=resolve;})});const pending=f.session.open();f.session.dispose();const old=f.state;finish([record()]);await pending;
 assert.equal(f.state,old);assert.equal(f.calls.some(([name])=>name==='create'),false);
});
test('leaving during create does not send a delayed user message',async()=>{
 let finish;const f=fixture({createConversation:()=>new Promise(resolve=>{finish=resolve;})});await f.session.open();f.session.newConversation();const pending=f.session.send('not yet sent');f.session.dispose();finish(record('late'));await pending;assert.equal(f.calls.some(([name])=>name==='send'),false);
});
test('realtime update is scoped to active agent/user and unsubscribed on leave',async()=>{
 const f=fixture();await f.session.open();f.emit(record('chat-1',{created_by_id:'other',messages:[{content:'private'}]}));assert.equal(f.state.messages.length,0);
 f.emit(record('chat-1',{messages:[{role:'assistant',content:'Hello'}]}));assert.equal(f.state.messages[0].content,'Hello');f.session.dispose();assert.equal(f.unsubscribed,1);
});
test('hidden/system messages are not exposed by renderer',()=>{
 assert.equal(visibleMessage({role:'system',content:'private'}),false);assert.equal(visibleMessage({role:'assistant',hidden:true}),false);assert.equal(visibleMessage({role:'assistant'}),true);
});
test('all four requested agents are wired without invoking them on render',()=>{
 const source=fs.readFileSync('src/components/agentCenter/NativeAgentChat.jsx','utf8');for(const name of ['chatgpt_teacher','chatgpt_advisor','chatgpt_intelligence','master_prompt_agent'])assert.ok(source.includes(name));
 assert.match(fs.readFileSync('src/pages/AgentCenter.jsx','utf8'),/nativeAgents\[active\].*<NativeAgentChat/);
 assert.equal(source.includes('.addMessage('),false);assert.match(source,/active.open\(\)/);assert.match(source,/Clear draft/);assert.match(source,/Hiding this panel does not cancel/);
});
test('learning suggestions cannot invoke AI on dashboard mount',()=>{
 const source=fs.readFileSync('src/components/agentCenter/LearningSuggestions.jsx','utf8');
 assert.match(source,/requestedFingerprint,setRequestedFingerprint\]=useState\(null\)/);
 assert.match(source,/if\(!hasWorkflow\|\|requestedFingerprint!==fingerprint\)return/);
 assert.match(source,/onClick=\{\(\)=>setRequestedFingerprint\(fingerprint\)\}/);
});
