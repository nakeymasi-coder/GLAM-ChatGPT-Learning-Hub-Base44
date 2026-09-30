import React,{useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
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
import SetupGuide from '@/components/agentCenter/SetupGuide';
import HistoryExplorer from '@/components/agentCenter/HistoryExplorer';
import TemplateGuide from '@/components/agentCenter/TemplateGuide';
import {Failure,primary} from '@/components/agentCenter/ui';
const tabs=[['dashboard','Dashboard'],['setup','New Project Setup'],['history','Prompt History Guide'],['templates','Template Guide'],['teacher','ChatGPT Teacher'],['advisor','ChatGPT Advisor'],['intelligence','ChatGPT Intelligence'],['agent','Master Prompt Agent'],['vault','Master Prompt Vault'],['import','Import Center'],['settings','Settings / Admin']];
const navGroups = [
 {label:'Learn ChatGPT', ids:['teacher','intelligence']},
 {label:'Make something', ids:['advisor','setup','templates','agent']},
 {label:'Find my saved work', ids:['vault','history','import']},
];
const sectionLabels = {dashboard:'Choose a starting point',teacher:'Learn with the Teacher',intelligence:'ChatGPT updates',advisor:'Help with my idea',setup:'Plan a project',templates:'Use a project template',agent:'Create a reusable prompt',vault:'Saved reusable prompts',history:'Find prompt history',import:'Import chat history',settings:'Settings'};
export default function AgentCenter(){
 const {user}=useAuth();const [params,setParams]=useSearchParams();const active=tabs.some(([id])=>id===params.get('section'))?params.get('section'):'dashboard';
 const [data,setData]=useState({progress:[],sessions:[],updates:[],prompts:[],versions:[],imports:[],summaries:[],history:[],projects:[],settings:[],uses:[]});const [loading,setLoading]=useState(true),[error,setError]=useState(''),[seed,setSeed]=useState(''),[key,setKey]=useState(0);
 async function load(){setLoading(true);setError('');try{const names=[['progress','AgentLearningProgress'],['sessions','AgentAdvisorSession'],['prompts','AgentMasterPrompt'],['versions','AgentPromptVersion'],['imports','AgentImport'],['summaries','AgentImportedSummary'],['uses','AgentPromptUseLog'],['history','PromptHistory'],['projects','HubProject']];const results=await Promise.all(names.map(async ([label,entity])=>[label,await base44.entities[entity].list('-created_date',500)]));const next=Object.fromEntries(results);if(user?.role==='admin'){const [updates,settings]=await Promise.all([base44.entities.AgentUpdate.list('-created_date',200),base44.entities.HubAdminSetting.list('-created_date',200)]);next.updates=updates;next.settings=settings;}else{next.updates=[];next.settings=[]}setData(d=>({...d,...next}));}catch(e){setError(e.message||'Could not load Agent Center.')}finally{setLoading(false)}}
 useEffect(()=>{if(user)load()},[user?.id]);
 function setField(name){return value=>setData(d=>({...d,[name]:typeof value==='function'?value(d[name]):value}))}
 function go(section,prefill=''){setSeed(prefill);setKey(k=>k+1);setParams({section});window.scrollTo(0,0)}
 const shared={...data,prompts:data.prompts};
 return <div className="agent-center min-h-screen bg-background text-foreground"><header className="border-b border-border bg-card"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-widest text-ring">Glam Hustle Hub</p><h1 className="font-heading text-xl font-bold">Guided help</h1><p className="mt-1 text-sm text-muted-foreground">Choose one tool when you need a little more help.</p></div><Link to="/hub.html" className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 py-2 text-sm font-semibold">Back to Hub</Link></div></header><div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)]"><nav aria-label="Guided help navigation" className="space-y-2 lg:sticky lg:top-4 lg:h-fit">
 <button type="button" aria-current={active==='dashboard'?'page':undefined} className="min-h-11 w-full rounded-xl bg-card px-4 py-3 text-left text-sm font-semibold hover:bg-secondary" onClick={()=>go('dashboard')}>Choose a starting point</button>
 {navGroups.map(group=><details key={group.label} open={group.ids.includes(active)} className="rounded-xl border border-border bg-card px-4 py-1"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">{group.label} <span className="ml-auto" aria-hidden="true">⌄</span></summary><div className="space-y-1 pb-3">{group.ids.map(id=><button type="button" key={id} aria-current={active===id?'page':undefined} className={`min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm ${active===id?'bg-primary text-primary-foreground':'text-foreground hover:bg-secondary'}`} onClick={()=>go(id)}>{sectionLabels[id]}</button>)}</div></details>)}
 <details open={active==='settings'} className="rounded-xl border border-border bg-card px-4 py-1"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">More options <span className="ml-auto" aria-hidden="true">⌄</span></summary><button type="button" className="min-h-11 w-full px-3 py-2 text-left text-sm" aria-current={active==='settings'?'page':undefined} onClick={()=>go('settings')}>Settings</button></details>
 </nav><main className="min-w-0 space-y-4">{loading?<p role="status" className="p-5">Loading Agent Center…</p>:error?<div><Failure error={error}/><button className={`${primary} mt-3`} onClick={load}>Try again</button></div>:<React.Fragment key={`${active}-${key}`}>
 {active==='dashboard'&&<Dashboard data={shared} go={go}/>}
  {active==='setup'&&<SetupGuide projects={data.projects} setProjects={setField('projects')}/>}
  {active==='history'&&<HistoryExplorer userId={user?.id}/>}
  {active==='templates'&&<TemplateGuide projects={data.projects} setProjects={setField('projects')}/>}
 {active==='teacher'&&<Teacher progress={data.progress} setProgress={setField('progress')} initial={typeof seed==='string'?seed:''}/>}
 {active==='advisor'&&<Advisor sessions={data.sessions} setSessions={setField('sessions')} initial={typeof seed==='string'?seed:''} onAgent={text=>go('agent',text)} onTeacher={text=>go('teacher',text)}/>}
 {active==='intelligence'&&<Intelligence updates={data.updates} setUpdates={setField('updates')} isAdmin={user?.role==='admin'}/>}
 {active==='agent'&&<PromptAgent history={data.history} projects={data.projects} imports={data.imports} summaries={data.summaries} prompts={data.prompts} initial={typeof seed==='string'?seed:''} go={go}/>}
 {active==='vault'&&<Vault prompts={data.prompts} setPrompts={setField('prompts')} versions={data.versions} setVersions={setField('versions')} uses={data.uses} setUses={setField('uses')} projects={data.projects} initial={seed} mode={active}/>}
 {active==='import'&&<ImportCenter imports={data.imports} setImports={setField('imports')} summaries={data.summaries} setSummaries={setField('summaries')} projects={data.projects} history={data.history}/>}
 {active==='settings'&&<Settings isAdmin={user?.role==='admin'} settings={data.settings} setSettings={setField('settings')}/>}
 </React.Fragment>}</main></div></div>
}