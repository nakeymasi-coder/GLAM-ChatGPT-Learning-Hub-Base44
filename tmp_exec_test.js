async function runTest(agent, message) {
  const t0 = Date.now();
  let conv = await base44.agents.createConversation({ agent_name: agent, metadata: { name: 'Skill fix verification', description: 'post-fix smoke test ' + Date.now() } });
  if (conv && conv.data && !conv.id) conv = conv.data;
  const cid = conv.id || (conv.conversation && conv.conversation.id);
  console.log('[' + agent + '] conversation:', cid);
  await base44.agents.addMessage({ id: cid }, { role: 'user', content: message });
  while (Date.now() - t0 < 180000) {
    await new Promise(r => setTimeout(r, 8000));
    let full = await base44.agents.getConversation(cid);
    if (full && full.data && !full.messages) full = full.data;
    const msgs = (full && (full.messages || (full.conversation && full.conversation.messages))) || [];
    const asst = msgs.filter(m => m.role === 'assistant' && (m.content || '').trim());
    if (asst.length > 0) {
      console.log('[' + agent + '] REPLIED in ' + Math.round((Date.now() - t0) / 1000) + 's:');
      console.log(asst[asst.length - 1].content.slice(0, 700));
      return true;
    }
  }
  console.log('[' + agent + '] TIMEOUT - no assistant reply after 180s');
  return false;
}
await runTest('chatgpt_teacher', 'Teach me when I should use Work instead of regular Chat.');
