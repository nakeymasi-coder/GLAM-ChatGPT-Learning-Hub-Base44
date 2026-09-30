import {useEffect,useRef,useState} from 'react';
import ReactMarkdown from 'react-markdown';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {createAgentChatSession,visibleMessage} from './agentChatSession';
import {Panel,Failure,input,primary,secondary} from './ui';

export const nativeAgents = {
  teacher:{name:'chatgpt_teacher',title:'ChatGPT Teacher',intro:'Ask a question, try an example, and continue learning at your own pace.'},
  advisor:{name:'chatgpt_advisor',title:'ChatGPT Advisor',intro:'Talk through your goal and choose a practical ChatGPT workflow.'},
  intelligence:{name:'chatgpt_intelligence',title:'ChatGPT Intelligence',intro:'Ask about a change in ChatGPT. Request dated official sources and check whether it applies to your account.'},
  agent:{name:'master_prompt_agent',title:'Master Prompt Agent',intro:'Discuss repeated work and draft a reusable prompt. Review every proposed change before approving it.'}
};

export default function NativeAgentChat({section,initial=''}) {
  const config = nativeAgents[section];
  const {user} = useAuth();
  const session = useRef(null);
  const [state,setState] = useState({conversation:null,conversations:[],messages:[],loading:true,sending:false,ready:false,error:'',reloadRequired:false});
  const [text,setText] = useState(initial==='new'?'':initial);
  const [open,setOpen] = useState(true);
  useEffect(()=>{
    const active=createAgentChatSession(base44.agents,{agentName:config.name,userId:user?.id,title:config.title,onChange:setState});
    session.current=active; active.open();
    return ()=>{active.dispose();if(session.current===active)session.current=null;};
  },[config.name,config.title,user?.id]);
  async function send(event) {
    event.preventDefault();
    const content=text.trim();
    if (!content) return;
    const active=session.current;
    const sent=await active?.send(content);
    if (sent && session.current===active) setText(current=>current.trim()===content?'':current);
  }
  const disabled=state.loading||state.sending||!state.ready||state.reloadRequired;
  const shown=state.messages.filter(visibleMessage);
  function startNew() { if(session.current?.newConversation())setText(''); }
  return <Panel title={config.title+' conversation'} action={<button type="button" className={secondary} onClick={()=>setOpen(value=>!value)} aria-expanded={open}>{open?'Hide conversation':'Show conversation'}</button>}>
    <p className="text-sm text-muted-foreground">{config.intro}</p>
    <p className="mt-2 text-xs text-muted-foreground">Your conversation is saved to your signed-in account. Sending a message uses the Hub's AI allowance; opening this panel does not send a message.</p>
    {open&&<div className="mt-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="min-w-0 flex-1 text-sm font-medium">Saved conversations<select className={input+' mt-1'} value={state.conversation?.id||''} disabled={state.loading||state.sending} onChange={event=>{if(event.target.value)session.current?.open(event.target.value);else startNew();}}>
          <option value="">New conversation</option>{state.conversations.map(item=><option key={item.id} value={item.id}>{item.metadata?.name||config.title} · {new Date(item.updated_date||item.created_date).toLocaleDateString()}</option>)}
        </select></label>
        <button type="button" className={secondary+' self-end'} onClick={startNew} disabled={state.loading||state.sending}>New conversation</button>
        <button type="button" className={secondary+' self-end'} onClick={()=>session.current?.open(state.conversation?.id)} disabled={state.loading||state.sending}>Reload saved chat</button>
      </div>
      <div aria-live="polite" aria-busy={state.loading||state.sending} className="max-h-[55vh] min-h-40 space-y-3 overflow-y-auto rounded-xl border border-border bg-background p-4">
        {state.loading?<p role="status">Opening your saved conversation…</p>:shown.length?shown.map((message,index)=><div key={message.id||index} className={'rounded-xl p-3 text-sm leading-7 '+(message.role==='user'?'ml-4 bg-primary text-primary-foreground':'mr-4 bg-secondary text-secondary-foreground')}>
          <p className="mb-1 text-xs font-semibold">{message.role==='user'?'You':config.title}</p>
          {message.role==='user'?<p className="whitespace-pre-wrap break-words">{typeof message.content==='string'?message.content:''}</p>:<ReactMarkdown className="prose prose-sm max-w-none break-words text-inherit">{typeof message.content==='string'?message.content:''}</ReactMarkdown>}
          {message.tool_calls?.length>0&&<p className="mt-2 text-xs" role="status">{message.tool_calls.some(call=>['error','failed'].includes(call.status))?'An agent action failed. Review the answer before continuing.':message.tool_calls.some(call=>['running','pending','in_progress'].includes(call.status))?'Working with Hub tools…':'Hub tool activity received. Review the response for the outcome.'}</p>}
        </div>):<p className="text-sm text-muted-foreground">Start with one question. Nothing is sent until you choose Send.</p>}
        {state.sending&&<p role="status" className="text-sm">Sending your message…</p>}
        {!state.sending&&shown.at(-1)?.role==='user'&&<p role="status" className="text-sm text-muted-foreground">Waiting for the agent's response. You can reload the saved chat if updates pause.</p>}
      </div>
      <Failure error={state.error}/>
      <form onSubmit={send} className="space-y-2">
        <label className="block text-sm font-medium">Message {config.title}<textarea className={input+' mt-1'} rows={3} maxLength={4000} value={text} onChange={event=>setText(event.target.value)} disabled={disabled} placeholder="What would you like help with?"/></label>
        <div className="flex flex-wrap gap-2"><button className={primary} disabled={disabled||!text.trim()}>{state.sending?'Sending…':'Send'}</button><button type="button" className={secondary} onClick={()=>setText('')} disabled={state.sending||!text}>Clear draft</button></div>
      </form>
      {state.sending&&<p className="text-xs text-muted-foreground">Hiding this panel does not cancel a message that has already been sent.</p>}
    </div>}
  </Panel>;
}
