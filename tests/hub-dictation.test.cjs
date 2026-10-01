const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {parseHTML}=require('linkedom');
const source=fs.readFileSync(path.join(__dirname,'../public/hub-dictation.js'),'utf8');
function setup({supported=true,prefixed=false}={}) {
 const context=vm.createContext({});vm.runInContext(source,context);
 let text='Typed idea.', instances=[],timers=[],state;
 class Recognition { constructor(){instances.push(this);} start(){this.started=true;this.onstart?.();} stop(){this.stopped=true;} abort(){this.aborted=true;} }
 const env={isSecureContext:true,document:{documentElement:{lang:'en-US'}},navigator:{language:'en-US'},
   setTimeout:(fn,ms)=>{const item={fn,ms};timers.push(item);return item;},clearTimeout:item=>{item.cancelled=true;}};
 if(supported)env[prefixed?'webkitSpeechRecognition':'SpeechRecognition']=Recognition;
 const api=context.HubDictation.createController({env,getText:()=>text,setText:value=>text=value,onState:value=>state=value});
 function result(items,index=0){const results=items.map(([transcript,isFinal])=>Object.assign([{transcript}],{isFinal}));instances.at(-1).onresult?.({results,resultIndex:index});}
 function tick(){const item=timers.find(x=>!x.cancelled&&!x.used);if(item){item.used=true;item.fn();}}
 return {api,env,instances,timers,result,tick,get text(){return text;},set text(value){text=value;},get state(){return state;}};
}
test('never starts on construction; unsupported and prefixed browsers have explicit paths',()=>{
 const h=setup();assert.equal(h.instances.length,0);assert.equal(h.timers.length,0);
 const u=setup({supported:false});u.api.start();assert.equal(u.instances.length,0);assert.equal(u.api.getState().phase,'unsupported');
 const p=setup({prefixed:true});p.api.start();assert.equal(p.instances.length,1);assert.equal(p.instances[0].continuous,true);p.api.dispose();
});
test('final text appends once, interim stays separate, and editing is preserved',()=>{
 const h=setup();h.api.start();h.result([['pink letters',false]]);assert.equal(h.text,'Typed idea.');assert.equal(h.state.interim,'pink letters');
 h.result([['pink letters',true]]);h.result([['pink letters',true]]);assert.equal(h.text,'Typed idea. pink letters');
 h.text='Manually corrected.';h.result([['pink letters',true],['iced cookies',true]],1);assert.equal(h.text,'Manually corrected. iced cookies');
});
test('long dictation has no app timer or character truncation',()=>{
 const h=setup();h.api.start();assert.equal(h.timers.length,0);
 const long='very detailed idea '.repeat(6000);h.result([[long,true]]);assert.equal(h.text,'Typed idea. '+long.trim());assert.ok(h.text.length>100000);
 assert.equal(h.api.getState().active,true);
});
test('browser segment end keeps partial words, reconnects and appends later segments',()=>{
 const h=setup();h.api.start();h.result([['one',true],['two',false]]);h.instances[0].onend();assert.equal(h.text,'Typed idea. one two');assert.equal(h.state.phase,'reconnecting');
 h.tick();assert.equal(h.instances.length,2);h.result([['three',true]]);assert.equal(h.text,'Typed idea. one two three');
});
test('browser restarts are bounded with backoff, then require explicit resume',()=>{
 const h=setup();h.api.start();
 for(let i=0;i<4;i++){h.instances.at(-1).onend();h.tick();}
 assert.equal(h.instances.length,4);assert.deepEqual(h.timers.map(x=>x.ms),[500,1000,2000]);assert.equal(h.state.phase,'paused');assert.equal(h.state.active,false);
 h.api.start();assert.equal(h.instances.length,5);
});
test('final progress resets retry budget for long multi-segment speech',()=>{
 const h=setup();h.api.start();
 for(let i=0;i<20;i++){h.result([['segment '+i,true]]);h.instances.at(-1).onend();h.tick();}
 assert.equal(h.instances.length,21);assert.ok(h.text.endsWith('segment 19'));assert.equal(h.state.active,true);
});
test('Stop cancels pending restarts and allows final browser result before ending',()=>{
 const h=setup();h.api.start();h.result([['last words',false]]);h.api.stop();assert.equal(h.instances[0].stopped,true);
 h.result([['last words',true]]);h.instances[0].onend();assert.equal(h.text,'Typed idea. last words');assert.equal(h.state.active,false);assert.equal(h.timers.length,0);
 h.api.start();h.instances.at(-1).onend();h.api.stop();h.tick();assert.equal(h.instances.length,2);
});
for(const error of ['not-allowed','service-not-allowed','audio-capture','language-not-supported','language-unavailable','network','no-speech','unknown-browser-error']){
 test(error+' is not retried and preserves the draft',()=>{
  const h=setup();h.api.start();const r=h.instances[0];r.onerror({error});r.onend?.();h.tick();assert.equal(h.state.phase,'error');assert.equal(h.state.active,false);assert.equal(h.instances.length,1);assert.equal(h.text,'Typed idea.');
 });
}
test('network errors reveal their actual code and stop the reconnect loop without losing words',()=>{
 const h=setup();h.api.start();h.result([['keep my unfinished words',false]]);
 const r=h.instances[0],lateEnd=r.onend;
 r.onerror({error:'network'});lateEnd();h.tick();
 assert.equal(h.text,'Typed idea. keep my unfinished words');
 assert.match(h.state.message,/could not connect \(network\)/);
 assert.doesNotMatch(h.state.message,/Microphone access.*denied/);
 assert.equal(h.state.active,false);assert.equal(r.aborted,true);assert.equal(h.timers.length,0);
});
test('service blocking is explained separately from microphone permission',()=>{
 const h=setup();h.api.start();h.instances[0].onerror({error:'service-not-allowed'});
 assert.match(h.state.message,/speech recognition service/);assert.match(h.state.message,/separate from microphone permission/);
});
test('ending before listening starts does not create a misleading reconnect loop',()=>{
 const h=setup();h.env.SpeechRecognition.prototype.start=function(){this.started=true;};
 h.api.start();h.instances[0].onend();h.tick();
 assert.equal(h.state.active,false);assert.match(h.state.message,/ended before listening started/);assert.equal(h.timers.length,0);
});
test('recognition uses the browser locale ahead of a generic document language',()=>{
 const h=setup();h.env.document.documentElement.lang='en';h.env.navigator.language='en-US';h.api.start();
 assert.equal(h.instances[0].lang,'en-US');
});
test('cancel and disposal abort capture and ignore stale events',()=>{
 const h=setup();h.api.start();h.result([['keep this',false]]);const r=h.instances[0],late=r.onresult;
 h.api.dispose();late({results:[Object.assign([{transcript:'stale'}],{isFinal:true})]});assert.equal(r.aborted,true);assert.equal(h.text,'Typed idea. keep this');assert.equal(h.timers.length,0);
});
test('disabled input cannot start and becomes paused without losing the draft',()=>{
 const h=setup();h.api.setDisabled(true);h.api.start();assert.equal(h.instances.length,0);h.api.setDisabled(false);h.api.start();h.api.setDisabled(true);assert.equal(h.instances[0].aborted,true);assert.equal(h.state.active,false);
});
test('DOM control starts only on click, blocks Send while finishing, pauses on hidden page and cleans up',()=>{
 const {window}=parseHTML('<html lang="en"><body><section class="panel active"><textarea id="idea"></textarea><div id="mount"></div><button id="send">Send</button></section></body></html>');
 let instances=[];window.SpeechRecognition=class{constructor(){instances.push(this);}start(){this.onstart?.();}stop(){this.stopped=true;}abort(){this.aborted=true;}};
 const c=vm.createContext({window});vm.runInContext(source,c);
 const field=window.document.getElementById('idea'),host=window.document.getElementById('mount');
 field.value='My draft';let sent=0;
 const mounted=window.HubDictation.mount(host,{label:'idea',sendSelector:'#send',getText:()=>field.value,setText:value=>field.value=value,panel:host.parentElement});
 assert.equal(instances.length,0);assert.match(host.textContent,/browser may send audio/);
 host.querySelector('button').click();assert.equal(instances.length,1);assert.equal(host.querySelector('button').getAttribute('aria-pressed'),'true');
 // Exercise capture handler using a real cancelable bubbling submit route below; Linkedom's click propagation differs from browsers.
 const ev=new window.Event('click',{bubbles:true,cancelable:true});window.document.getElementById('send').dispatchEvent(ev);
 assert.equal(ev.defaultPrevented,true);assert.equal(instances[0].stopped,true);assert.equal(sent,0);
 instances[0].onend();host.querySelector('button').click();
 Object.defineProperty(window.document,'hidden',{value:true,configurable:true});window.document.dispatchEvent(new window.Event('visibilitychange'));
 assert.equal(instances.at(-1).aborted,true);assert.equal(mounted.controller.getState().active,false);
 mounted.dispose();assert.equal(host.children.length,0);
});
test('static wiring is idempotent and typed fallback needs no network or permission',()=>{
 const {window}=parseHTML('<html><body><section class="panel active"><textarea id="askChatgptInput"></textarea><button id="askChatgptBtn"></button><button id="askChatgptClear"></button></section></body></html>');
 window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;
 const c=vm.createContext({window});vm.runInContext(source,c);window.HubDictation.mountStatic();window.HubDictation.mountStatic();
 assert.equal(window.document.querySelectorAll('.hub-dictation-button').length,1);assert.equal(window.document.querySelector('.hub-dictation-button').disabled,true);
 assert.match(window.document.querySelector('[role="status"]').textContent,/still type/);
});
test('static and React entrypoints load dictation and native chat has no draft character cap',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/hub.html'),'utf8'),index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),native=fs.readFileSync(path.join(__dirname,'../src/components/agentCenter/NativeAgentChat.jsx'),'utf8');
 assert.ok(html.includes('/hub-dictation.js'));assert.ok(index.includes('/hub-dictation.js'));assert.ok(native.includes('<DictationControl'));assert.ok(!native.includes('maxLength={4000}'));
 assert.ok(!source.includes('getUserMedia'));assert.ok(!source.includes('MediaRecorder'));assert.ok(!source.includes('fetch('));
});
