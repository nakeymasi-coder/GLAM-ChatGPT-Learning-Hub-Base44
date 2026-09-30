// Conversation state is separate from rendering so it can be verified without AI calls.
/** @param {any} error */
export function chatError(error) {
  const status = error?.status || error?.response?.status;
  if (status === 401 || status === 403) return 'Your session or agent access could not be verified. Sign in again, then reload this conversation.';
  return error?.response?.data?.error || error?.message || 'The conversation could not be loaded. Please try again.';
}
/** @param {any} conversation @param {string} agentName @param {string} userId */
export function belongsToAgent(conversation, agentName, userId) {
  return !!conversation?.id && conversation.agent_name === agentName && conversation.created_by_id === userId;
}
/** @param {any} message */
export function visibleMessage(message) {
  return !message?.hidden && ['user', 'assistant'].includes(message?.role);
}
/**
 * Reads on open; creates and invokes an agent only after send().
 * @param {any} agents
 * @param {{agentName:string,userId:string,title:string,onChange:(state:any)=>void}} options
 */
export function createAgentChatSession(agents, {agentName, userId, title, onChange}) {
  /** @type {any} */
  let state = {conversation:null,conversations:[],messages:[],loading:false,sending:false,ready:false,error:'',reloadRequired:false};
  let disposed = false, revision = 0;
  /** @type {null | (()=>void)} */
  let unsubscribe = null;
  function patch(next) { if (!disposed) {state = {...state,...next}; onChange(state);} }
  function stop() { if (unsubscribe) unsubscribe(); unsubscribe = null; }
  function attach(conversation) {
    if (!belongsToAgent(conversation,agentName,userId)) throw new Error('This conversation does not belong to your selected agent.');
    stop();
    patch({conversation,messages:conversation.messages || []});
    unsubscribe = agents.subscribeToConversation(conversation.id, update => {
      if (disposed || state.conversation?.id !== conversation.id || !belongsToAgent(update,agentName,userId)) return;
      patch({conversation:update,messages:update.messages || []});
    });
  }
  async function open(id) {
    if (disposed || state.sending) return;
    const currentRevision = ++revision;
    stop(); patch({loading:true,ready:false,error:''});
    try {
      if (!userId) throw new Error('Please sign in to open your saved conversation.');
      const list = await agents.listConversations({q:{agent_name:agentName,created_by_id:userId},sort:'-updated_date',limit:50});
      if (disposed || currentRevision !== revision) return;
      if (!Array.isArray(list)) {
        const shape = list && typeof list === 'object' ? Object.keys(list).filter(key=>/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)).slice(0,8).join(', ') : typeof list;
        throw new Error('Saved conversation response format was not recognized (container keys: '+shape+'). No conversation has been changed.');
      }
      const conversations = list.filter(item=>belongsToAgent(item,agentName,userId));
      if (list.length && !conversations.length) throw new Error('Saved conversations were returned, but none could be verified for this agent and signed-in account. No conversation has been changed.');
      patch({conversations});
      const selected = id ? conversations.find(item=>item.id===id) : conversations[0];
      if (id && !selected) throw new Error('That conversation is unavailable. Reload your saved conversations.');
      if (selected) {
        const full = await agents.getConversation(selected.id);
        if (disposed || currentRevision !== revision) return;
        attach(full);
      } else patch({conversation:null,messages:[]});
      patch({ready:true,reloadRequired:false});
    } catch (error) {
      if (!disposed && currentRevision === revision) patch({error:chatError(error),ready:false});
    } finally {
      if (!disposed && currentRevision === revision) patch({loading:false});
    }
  }
  function newConversation() {
    if (disposed || state.loading || state.sending) return false;
    ++revision; stop();
    patch({conversation:null,messages:[],error:'',ready:true,reloadRequired:false});
    return true;
  }
  async function send(rawText) {
    const content = String(rawText || '').trim();
    if (disposed || !content || !state.ready || state.loading || state.sending || state.reloadRequired) return false;
    patch({sending:true,error:''});
    const currentRevision = revision;
    try {
      let conversation = state.conversation;
      if (!conversation) {
        conversation = await agents.createConversation({agent_name:agentName,metadata:{name:title,description:'Learning Hub guided conversation'}});
        if (disposed || currentRevision !== revision) return false;
        attach(conversation);
        patch({conversations:[conversation,...state.conversations]});
      }
      await agents.addMessage(conversation,{role:'user',content});
      if (disposed || currentRevision !== revision) return true;
      // Fetch stored messages as a recovery path when realtime is slow.
      try {
        const full = await agents.getConversation(conversation.id);
        if (!disposed && currentRevision === revision && belongsToAgent(full,agentName,userId)) patch({conversation:full,messages:full.messages || []});
      } catch (_) { /* The subscription or Refresh can still retrieve the response. */ }
      return true;
    } catch (error) {
      if (!disposed && currentRevision === revision) patch({error:chatError(error)+' Reload the saved conversation before sending again; your last message may already have arrived.',reloadRequired:true});
      return false;
    } finally {
      if (!disposed && currentRevision === revision) patch({sending:false});
    }
  }
  return {open,send,newConversation,getState:()=>state,dispose:()=>{disposed=true;++revision;stop();}};
}
