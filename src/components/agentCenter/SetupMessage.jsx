import ReactMarkdown from 'react-markdown';
export default function SetupMessage({message}) {
  const mine = message.role === 'user';
  return <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${mine ? 'bg-primary text-primary-foreground' : 'border border-border bg-secondary text-secondary-foreground'}`}>
    {mine ? <p className="whitespace-pre-wrap break-words">{message.content}</p> : <ReactMarkdown className="prose prose-sm max-w-none break-words text-inherit">{message.content || ''}</ReactMarkdown>}
    {message.tool_calls?.map((call,i) => {const running=['pending','running','in_progress'].includes(call.status);const failed=['failed','error'].includes(call.status)||/error|failed/i.test(typeof call.results==='string'?call.results:JSON.stringify(call.results||''))||call.results?.success===false;const hidden=call.display_projection?.hide_details&&call.display_projection?.details_redacted;return <p key={i} className="mt-2 text-xs" role="status">{hidden?(running?call.display_projection.active_label:failed?call.display_projection.error_label:call.display_projection.label):(failed?'Project save failed':running?'Saving project…':'Project action complete')}</p>})}
  </div></div>;
}