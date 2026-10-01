/* Click-to-dictate only. No audio is recorded or uploaded by Hub code. */
(function (root) {
  'use strict';
  let currentController = null;
  const privacy = 'Dictation adds words to the end of your draft. Edit them before sending. Your browser may send audio to its speech service. The Hub does not save audio. No Hub dictation timer or character cap; your browser or device can still pause it.';
  function createController(options) {
    const env = options.env || root;
    const Recognition = env.SpeechRecognition || env.webkitSpeechRecognition;
    const supported = !!Recognition && env.isSecureContext !== false;
    let recognition = null, timer = null, intent = false, disposed = false, retries = 0;
    let pending = '', seen = new Set(), disabled = false;
    let state = {supported, phase: supported ? 'idle' : 'unsupported', active:false, interim:'',
      message: supported ? 'Ready when you are. Nothing is sent automatically.' : 'Dictation is unavailable in this browser. You can still type or use your device’s keyboard dictation.'};
    function update(next) { state={...state,...next}; if(!disposed)options.onState?.({...state}); }
    function append(text) {
      const clean=String(text||'').trim();
      if (!clean) return;
      const existing=String(options.getText()||'');
      options.setText(existing+(existing && !/\s$/.test(existing) ? ' ' : '')+clean);
    }
    function flushPending() { if(pending)append(pending); pending=''; }
    function clearTimer() { if(timer!==null)env.clearTimeout(timer);timer=null; }
    function release() { if(currentController===api)currentController=null; }
    function cancel(message='Dictation paused. Your words are still in the draft.') {
      intent=false;clearTimer();flushPending();
      const old=recognition;recognition=null;
      if(old){old.onstart=old.onresult=old.onerror=old.onend=null;try{old.abort();}catch(_){}}
      release();
      update({phase:'idle',active:false,interim:'',message});
    }
    function fail(message) {
      cancel(message);
      update({phase:'error',message});
    }
    function retry() {
      if(!intent || disposed || disabled)return;
      if(retries>=3) {intent=false;release();update({phase:'paused',active:false,interim:'',message:'Your browser paused dictation. Your words are kept. Select Resume dictation to continue.'});return;}
      const delay=500*Math.pow(2,retries++);
      update({phase:'reconnecting',active:true,interim:'',message:'Your browser paused. Reconnecting dictation… You can stop at any time.'});
      timer=env.setTimeout(()=>{timer=null;if(intent&&!disposed&&!disabled)begin();},delay);
    }
    function begin() {
      if(disposed||disabled||!intent)return;
      let active, didStart=false;
      try { active=new Recognition(); } catch(_) {fail('Dictation could not start. You can keep typing and try again.');return;}
      recognition=active;seen=new Set();pending='';
      active.lang=env.navigator?.language || env.document?.documentElement?.lang || 'en-US';
      active.continuous=true;active.interimResults=true;active.maxAlternatives=1;
      update({phase:'starting',active:true,interim:'',message:'Starting microphone… Allow access in your browser if asked.'});
      active.onstart=()=>{if(recognition===active&&intent){didStart=true;update({phase:'listening',active:true,message:'Listening… Keep talking. Select Stop dictation when you’re ready to review.'});}};
      active.onresult=event=>{
        if(recognition!==active||disposed)return;
        const interim=[];
        for(let i=0;i<event.results.length;i++) {
          const result=event.results[i],text=String(result[0]?.transcript||'').trim();
          if(result.isFinal) { if(!seen.has(i)){seen.add(i);append(text);if(text)retries=0;} }
          else if(text)interim.push(text);
        }
        pending=interim.join(' ');
        update({interim:pending});
      };
      active.onerror=event=>{
        if(recognition!==active||disposed)return;
        const reason=event.error;
        if(reason==='not-allowed')fail('Microphone access is blocked (not-allowed). Check this site’s microphone permission, then select Start dictation. Your draft is kept.');
        else if(reason==='service-not-allowed')fail('Your browser blocked its speech recognition service (service-not-allowed). This is separate from microphone permission. Your draft is kept; try your device’s keyboard dictation.');
        else if(reason==='network')fail('Your browser’s speech service could not connect (network). Dictation has stopped instead of repeatedly reconnecting. Your draft is kept. Try again, or use your device’s keyboard dictation.');
        else if(reason==='no-speech')fail('The browser did not detect speech (no-speech). Check the selected microphone, then select Start dictation and speak. Your draft is kept.');
        else if(reason==='audio-capture')fail('No working microphone was found (audio-capture). Check your microphone and try again, or use keyboard dictation. Your draft is kept.');
        else if(['language-not-supported','language-unavailable'].includes(reason))fail('Your browser cannot recognize speech in this language ('+reason+'). Use keyboard dictation or type instead. Your draft is kept.');
        else if(reason==='aborted')cancel('Dictation was interrupted (aborted). Your draft is kept. Select Start dictation to try again.');
        else fail('Speech recognition stopped ('+String(reason||'unknown-error')+'). Your draft is kept. Select Start dictation to try again, or use keyboard dictation.');
      };
      active.onend=()=>{
        if(recognition!==active||disposed)return;
        flushPending();recognition=null;
        if(intent&&!didStart)fail('Speech recognition ended before listening started. Your browser did not report a reason. Your draft is kept; select Start dictation to retry or use keyboard dictation.');
        else if(intent)retry();
        else {release();update({phase:'idle',active:false,interim:'',message:'Dictation stopped. Review your words, then send when ready.'});}
      };
      try{active.start();}catch(error){fail(error?.name==='NotAllowedError'?'Microphone access was denied. You can keep typing.':'Your browser could not start dictation. Try again or keep typing.');}
    }
    function start() {
      if(!supported||disabled||disposed||state.active)return;
      if(currentController&&currentController!==api)currentController.cancel();
      currentController=api;intent=true;retries=0;begin();
    }
    function stop() {
      intent=false;clearTimer();
      if(recognition){update({phase:'stopping',active:true,message:'Stopping… finishing the last words before you review.'});try{recognition.stop();}catch(_){cancel('Dictation stopped. Review your words before sending.');}}
      else cancel('Dictation stopped. Review your words before sending.');
    }
    const api={start,stop,cancel,getState:()=>({...state}),setDisabled(value){disabled=!!value;if(disabled&&state.active)cancel();},
      dispose(){cancel();disposed=true;}};
    return api;
  }
  function mount(container, options) {
    const doc=container.ownerDocument, env=doc.defaultView || root;
    const button=doc.createElement('button');button.type='button';button.className='hub-dictation-button';
    const status=doc.createElement('p');status.className='hub-dictation-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const interim=doc.createElement('p');interim.className='hub-dictation-interim';interim.hidden=true;
    const note=doc.createElement('p');note.className='hub-dictation-note';note.textContent=privacy;
    const recovery=doc.createElement('p');recovery.className='hub-dictation-note';recovery.hidden=true;
    const platform=String(env.navigator?.userAgent||env.navigator?.platform||'');
    recovery.textContent=/Windows|Win32|Win64/i.test(platform)
      ? 'Windows fallback: click in the text box, then press Windows + H to use Windows voice typing. Review the words before sending.'
      : 'Fallback: click in the text box and use your device’s keyboard dictation, or continue typing. Review the words before sending.';
    container.classList.add('hub-dictation');container.append(button,status,interim,recovery,note);
    let disabled=false;
    const render=state=>{
      button.textContent=state.active?'■ Stop dictation':state.phase==='paused'?'🎙 Resume dictation':'🎙 Start dictation';
      button.setAttribute('aria-pressed',String(state.active));
      button.setAttribute('aria-label',(state.active?'Stop':'Start')+' dictation for '+(options.label||'your message'));
      button.disabled=!state.supported||disabled||state.phase==='stopping';
      status.textContent=state.message;interim.textContent=state.interim?'Hearing: '+state.interim:'';interim.hidden=!state.interim;
      recovery.hidden=!['error','paused','unsupported'].includes(state.phase);
      options.onState?.(state);
    };
    const controller=createController({...options,env,onState:render});
    render(controller.getState());
    button.addEventListener('click',()=>controller.getState().active?controller.stop():controller.start());
    const pause=()=>{if(controller.getState().active)controller.cancel();};
    const visibility=()=>{if(doc.hidden)pause();};
    const guard=event=>{
      if(!controller.getState().active)return;
      const target=event.target;
      if(container.contains(target))return;
      const form=container.closest('form');
      const isSubmit=event.type==='submit' && form===target;
      const explicitSend=options.sendSelector && target.closest?.(options.sendSelector);
      if(isSubmit||explicitSend){event.preventDefault();event.stopImmediatePropagation();controller.stop();return;}
      if(target.closest?.('a[href], [data-tab], .side-link, [data-dictation-pause]') || (form&&target.closest?.('button[type="button"]')))pause();
    };
    doc.addEventListener('visibilitychange',visibility);
    doc.addEventListener('click',guard,true);
    doc.addEventListener('submit',guard,true);
    env.addEventListener('pagehide',pause);env.addEventListener('popstate',pause);env.addEventListener('hashchange',pause);
    const host=options.panel;
    const observer=host&&env.MutationObserver?new env.MutationObserver(()=>{if(!host.classList.contains('active'))pause();}):null;
    observer?.observe(host,{attributes:true,attributeFilter:['class']});
    return {controller,setDisabled(value){disabled=!!value;controller.setDisabled(disabled);render(controller.getState());},dispose(){
      controller.dispose();observer?.disconnect();
      doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('click',guard,true);doc.removeEventListener('submit',guard,true);
      env.removeEventListener('pagehide',pause);env.removeEventListener('popstate',pause);env.removeEventListener('hashchange',pause);
      container.replaceChildren();
    }};
  }
  function mountStatic() {
    const configs=[
      ['askChatgptInput','your Concierge message','#askChatgptBtn'],
      ['askLibDescribe','your idea','#panel-asklibrary button[onclick="buildAskLibraryPrompt()"]'],
      ['askLibUnknown','your idea','#panel-asklibrary button[onclick="sendUnknownToAskHub()"]'],
      ['typeText','your exact typography wording','#typeBuild']
    ];
    configs.forEach(([id,label,sendSelector])=>{
      const field=root.document?.getElementById(id);if(!field||field.dataset.dictationMounted)return;
      field.dataset.dictationMounted='true';
      const container=root.document.createElement('div');field.after(container);
      mount(container,{label,sendSelector,panel:field.closest('.panel'),getText:()=>field.value,setText:value=>{field.value=value;field.dispatchEvent(new root.Event('input',{bubbles:true}));}});
    });
    root.document?.getElementById('askChatgptClear')?.setAttribute('data-dictation-pause','');
    root.document?.querySelectorAll('[data-ask-starter]').forEach(el=>el.setAttribute('data-dictation-pause',''));
  }
  root.HubDictation={createController,mount,mountStatic,pause:()=>currentController?.cancel()};
})(typeof window!=='undefined'?window:globalThis);
