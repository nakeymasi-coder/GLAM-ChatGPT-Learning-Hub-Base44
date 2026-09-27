import React,{useEffect,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import Dashboard from '@/components/agentCenter/Dashboard';
import Teacher from '@/components/agentCenter/Teacher';
import Advisor from '@/components/agentCenter/Advisor';
import Intelligence from '@/components/agentCenter/Intelligence';
import PromptAgent from '@/components/agentCenter/PromptAgent';
import Vault from '@/components/agentCenter/Vault';
import ImportCenter from '@/components/agentCenter/ImportCenter';
import Settings from '@/components/agentCenter/Settings';
import {Failure,primary} from '@/components/agentCenter/ui';
const tabs=[['dashboard','Dashboard'],['teacher','ChatGPT Teacher'],['advisor','ChatGPT Advisor'],['intelligence','ChatGPT Intelligence'],['agent','Master Prompt Agent'],['vault','Master Prompt Vault'],['import','Import Center'],['settings','Settings / Admin']];
export default function AgentCenter(){
 const {user}=useAuth();const [params,setParams]=useSearchParams();const active=tabs.some(([id])=>id===params.get('section'))?params.get('section'):'dashboard';
 const [data,setData]=useState({progress:[],sessions:[],updates:[],prompts:[],versions:[],imports:[],summaries:[],history:[],projects:[],settings:[],uses:[]});const [loading,setLoading]=useState(true),[error,setError]=useState(''),[seed,setSeed]=useState(''),[key,setKey]=useState(0);
 async function load(){setLoading(true);setError('');try{const acceptance=await base44.entities.LegalAcceptance.list('-created_date',50);if(!acceptance.some(r=>r.terms_version==='2026-09-07'&&r.privacy_version==='2026-09-07')){window.location.replace('/legal-consent?returnTo=%2Fagent-center');return;}const names=[['progress','AgentLearningProgress'],['sessions','AgentAdvisorSession'],['prompts','AgentMasterPrompt'],['versions','AgentPromptVersion'],['imports','AgentImport'],['summaries','AgentImportedSummary'],['uses','AgentPromptUseLog'],['history','PromptHistory'],['projects','HubProject']];const results=await Promise.all(names.map(async ([label,entity])=>[label,await base44.entities[entity].list('-created_date',500)]));const next=Object.fromEntries(results);if(user?.role==='admin'){const [updates,settings]=await Promise.all([base44.entities.AgentUpdate.list('-created_date',200),base44.entities.HubAdminSetting.list('-created_date',200)]);next.updates=updates;next.settings=settings;}else{next.updates=[];next.settings=[]}setData(d=>({...d,...next}));}catch(e){setError(e.message||'Could not load Agent Center.')}finally{setLoading(false)}}
 useEffect(()=>{if(user)load()},[user?.id]);
 function setField(name){return value=>setData(d=>({...d,[name]:typeof value==='function'?value(d[name]):value}))}
 function go(section,prefill=''){setSeed(prefill);setKey(k=>k+1);setParams({section});window.scrollTo(0,0)}
 const shared={...data,prompts:data.prompts};
 const businessContext=data.settings.find(s=>s.key==='agent_business_context')?.value||'';
 return <div className="agent-center min-h-screen bg-background text-foreground"><header className="border-b border-border bg-card"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-widest text-ring">Glam Hustle Hub</p><h1 className="font-heading text-xl font-bold">Agent Center</h1></div><Link to="/" className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 py-2 text-sm font-semibold">Back to Hub</Link></div></header><div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)]"><nav aria-label="Agent Center" className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-4 lg:h-fit lg:flex-col lg:overflow-visible">{tabs.map(([id,label])=><button key={id} className={`min-h-11 shrink-0 rounded-xl px-4 py-2 text-left text-sm font-semibold ${active===id?'bg-primary text-primary-foreground':'bg-card text-foreground hover:bg-secondary'}`} onClick={()=>go(id)}>{label}</button>)}</nav><main className="min-w-0 space-y-4">{loading?<p role="status" className="p-5">Loading Agent Center…</p>:error?<div><Failure error={error}/><button className={`${primary} mt-3`} onClick={load}>Try again</button></div>:<React.Fragment key={`${active}-${key}`}>
 {active==='dashboard'&&<Dashboard data={shared} go={go}/>}
 {active==='teacher'&&<Teacher progress={data.progress} setProgress={setField('progress')} initial={typeof seed==='string'?seed:''} businessContext={businessContext}/>} 
 {active==='advisor'&&<Advisor sessions={data.sessions} setSessions={setField('sessions')} initial={typeof seed==='string'?seed:''} businessContext={businessContext} onAgent={text=>go('agent',text)} onTeacher={text=>go('teacher',text)}/>}
 {active==='intelligence'&&<Intelligence updates={data.updates} setUpdates={setField('updates')} isAdmin={user?.role==='admin'} businessContext={businessContext}/>} 
 {active==='agent'&&<PromptAgent history={data.history} projects={data.projects} imports={data.imports} summaries={data.summaries} prompts={data.prompts} initial={typeof seed==='string'?seed:''} businessContext={businessContext} go={go}/>} 
 {active==='vault'&&<Vault prompts={data.prompts} setPrompts={setField('prompts')} versions={data.versions} setVersions={setField('versions')} uses={data.uses} setUses={setField('uses')} projects={data.projects} initial={seed} mode={active}/>}
 {active==='import'&&<ImportCenter imports={data.imports} setImports={setField('imports')} summaries={data.summaries} setSummaries={setField('summaries')} projects={data.projects} history={data.history}/>}
 {active==='settings'&&<Settings isAdmin={user?.role==='admin'} settings={data.settings} setSettings={setField('settings')}/>}
 </React.Fragment>}</main></div></div>
}