import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import axios from 'axios';
import {createAgentsModule} from '../node_modules/@base44/sdk/dist/modules/agents.js';
import {createAgentChatSession} from '../src/components/agentCenter/agentChatSession.js';

const agentName='chatgpt_teacher',userId='learner-1';
const record=(extra={})=>({id:'chat-1',agent_name:agentName,created_by_id:userId,messages:[{role:'assistant',content:'A saved test reply'}],...extra});
function sessionFor(agents) {
 let state;
 const session=createAgentChatSession(agents,{agentName,userId,title:'Teacher',onChange:value=>{state=value;}});
 return {session,get state(){return state;}};
}

test('installed SDK and real Axios serialize the owner-scoped query as one JSON parameter without network',async()=>{
 const requests=[];
 const transport=axios.create({adapter:async config=>{
  assert.equal(config.method,'get','read-only recovery must never invoke generation');
  const url=new URL(axios.getUri(config),'https://sdk-test.invalid');
  requests.push(url);
  const listing=url.pathname.endsWith('/conversations');
  if(listing) {
   assert.equal(url.searchParams.has('q[agent_name]'),false);
   assert.equal(url.searchParams.has('q[created_by_id]'),false);
   assert.deepEqual(JSON.parse(url.searchParams.get('q')),{agent_name:agentName,created_by_id:userId});
   assert.equal(url.searchParams.get('limit'),'50');
  }
  return {data:listing?[record()]:record(),status:200,statusText:'OK',headers:{},config};
 }});
 transport.interceptors.response.use(response=>response.data);
 const api=createAgentsModule({axios:transport,getSocket:()=>({subscribeToRoom:()=>()=>{}}),appId:'sdk-test-app',serverUrl:'https://sdk-test.invalid'});
 const f=sessionFor(api);await f.session.open();
 assert.equal(f.state.conversation.id,'chat-1');assert.equal(f.state.messages[0].content,'A saved test reply');
 assert.ok(requests.some(url=>url.pathname.endsWith('/conversations/chat-1')));
 f.session.dispose();
});

test('unknown response shapes fail visibly and cannot silently start duplicate chats',async()=>{
 for(const response of [null,{}, {conversations:[]},'unexpected']) {
  let writes=0;
  const f=sessionFor({listConversations:async()=>response,createConversation:async()=>{writes++;}});
  await f.session.open();
  assert.match(f.state.error,/response format was not recognized/);
  assert.equal(f.state.ready,false);assert.equal(await f.session.send('do not duplicate'),false);assert.equal(writes,0);
  f.session.dispose();
 }
 const source=fs.readFileSync('src/components/agentCenter/NativeAgentChat.jsx','utf8');
 assert.equal(source.includes('state.diagnostic'),false);
});

test('empty lists are legitimate but unverified nonempty lists never expose a record',async()=>{
 for(const entries of [[record({created_by_id:'other-user'})],[record({agent_name:'other-agent'})],[record({created_by_id:undefined})]]) {
  let reads=0;
  const f=sessionFor({listConversations:async()=>entries,getConversation:async()=>{reads++;}});
  await f.session.open();assert.equal(f.state.ready,false);assert.match(f.state.error,/none could be verified/);
  assert.equal(reads,0);assert.equal(f.state.conversation,null);f.session.dispose();
 }
 const f=sessionFor({listConversations:async()=>[]});
 await f.session.open();assert.equal(f.state.ready,true);assert.equal(f.state.error,'');assert.equal(f.state.conversation,null);f.session.dispose();
});

test('reopening after an in-flight send restores the stored reply without retrying the send',async()=>{
 const stored=record({messages:[]});let finish;let sends=0;let creates=0;
 const gate=new Promise(resolve=>{finish=resolve;});
 const api={
  listConversations:async()=>[stored],
  getConversation:async()=>stored,
  subscribeToConversation:()=>()=>{},
  createConversation:async()=>{creates++;return stored;},
  addMessage:async(conversation,message)=>{sends++;stored.messages.push(message);await gate;}
 };
 const first=sessionFor(api);await first.session.open();const pending=first.session.send('Original test question');
 first.session.dispose();
 stored.messages.push({role:'assistant',content:'The completed stored reply'});finish();await pending;
 const reopened=sessionFor(api);await reopened.session.open();
 assert.equal(reopened.state.messages.at(-1).content,'The completed stored reply');
 assert.equal(sends,1);assert.equal(creates,0);reopened.session.dispose();
});

test('learning suggestions reuse serialized reads and reject unknown lists before generating',()=>{
 const source=fs.readFileSync('src/components/agentCenter/LearningSuggestions.jsx','utf8');
 assert.ok(source.includes("JSON.stringify({agent_name:'hub_lesson_guide'})"));
 assert.ok(source.indexOf("if(!Array.isArray(result))throw")<source.indexOf('createConversation'));
 assert.ok(source.includes("result.filter(item=>item.agent_name==='hub_lesson_guide')"));
 assert.ok(source.includes('if(!hasWorkflow||requestedFingerprint!==fingerprint)return'));
});
