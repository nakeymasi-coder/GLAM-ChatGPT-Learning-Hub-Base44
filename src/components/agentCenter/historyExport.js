const columns = [['local_datetime','Local date & time'],['timezone','Timezone'],['tool_used','Tool'],['prompt','Prompt'],['response','Response'],['conversation_link','Conversation link'],['submitted_at','Submitted at']];
function csvCell(value) {
  let text=String(value??'');
  if (/^\s*[=+@-]/.test(text)) text=`'${text}`;
  return `"${text.replace(/"/g,'""')}"`;
}
export function exportHistory(rows) {
  const csv='\uFEFF'+[columns.map(([,label])=>csvCell(label)).join(','),...rows.map(row=>columns.map(([field])=>csvCell(row[field])).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`prompt-history-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}