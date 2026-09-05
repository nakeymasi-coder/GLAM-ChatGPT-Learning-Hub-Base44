import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  LayoutDashboard, Users, BookOpen, Megaphone, Settings, Library,
  ExternalLink, Plus, Save, Trash2, Search, Eye, EyeOff, Star, LogOut
} from 'lucide-react';

const blue = '#168FEA';
const deep = '#103B63';

function Pill({ children, tone = 'blue' }) {
  const cls = tone === 'green'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : tone === 'gray'
      ? 'bg-slate-50 text-slate-600 border-slate-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${cls}`}>{children}</span>;
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[.15em] text-slate-500">{label}</div>
      <div className="mt-2 text-4xl font-black text-slate-950">{value}</div>
      {sub && <div className="mt-1 text-sm text-slate-500">{sub}</div>}
    </div>
  );
}

export default function Admin() {
  const { user, logout, authChecked, navigateToLogin } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [settings, setSettings] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [search, setSearch] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newPrompt, setNewPrompt] = useState({ category:'Build', title:'', description:'', prompt:'' });
  const [notice, setNotice] = useState('');

  const isAdmin = user?.role === 'admin';

  async function refresh() {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [u, l, a, s, p] = await Promise.all([
        base44.entities.User.list('-created_date', 200),
        base44.entities.HubLessonAdmin.list('sort_order', 200),
        base44.entities.HubAnnouncement.list('-created_date', 100),
        base44.entities.HubAdminSetting.list('sort_order', 200),
        base44.entities.HubPromptTemplate.list('sort_order', 200),
      ]);
      setUsers(u || []); setLessons(l || []); setAnnouncements(a || []); setSettings(s || []); setPrompts(p || []);
    } catch (e) {
      setNotice(e?.message || 'Could not load admin data.');
    } finally { setLoading(false); }
  }

  useEffect(() => { if (authChecked && !user) navigateToLogin(); }, [authChecked, user, navigateToLogin]);
  useEffect(() => { refresh(); }, [isAdmin]);

  const activeLessons = lessons.filter(x => x.active !== false).length;
  const activeAnnouncements = announcements.filter(x => x.active).length;
  const filteredLessons = useMemo(() => lessons.filter(x => `${x.title} ${x.level} ${x.lesson_id}`.toLowerCase().includes(search.toLowerCase())), [lessons, search]);
  const filteredUsers = useMemo(() => users.filter(x => `${x.full_name || x.name || ''} ${x.email || ''} ${x.role || ''}`.toLowerCase().includes(search.toLowerCase())), [users, search]);

  if (!user) return <div className="min-h-screen grid place-items-center bg-white text-slate-900">Opening secure admin…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const nav = [
    ['dashboard','Dashboard',LayoutDashboard], ['users','Users',Users], ['lessons','Lessons',BookOpen],
    ['prompts','Prompt Library',Library], ['announcements','Announcements',Megaphone], ['settings','Settings',Settings]
  ];

  async function patch(entity, id, data) {
    try { await base44.entities[entity].update(id, data); await refresh(); setNotice('Saved.'); }
    catch (e) { setNotice(e?.message || 'Could not save.'); }
  }

  async function remove(entity, id) {
    if (!window.confirm('Remove this item?')) return;
    try { await base44.entities[entity].delete(id); await refresh(); setNotice('Removed.'); }
    catch (e) { setNotice(e?.message || 'Could not remove.'); }
  }

  async function addAnnouncement() {
    if (!newAnnouncement.trim()) return;
    await base44.entities.HubAnnouncement.create({ message:newAnnouncement.trim(), active:true, sort_order:1 });
    setNewAnnouncement(''); await refresh(); setNotice('Announcement added.');
  }

  async function addPrompt() {
    if (!newPrompt.title.trim() || !newPrompt.prompt.trim()) return;
    await base44.entities.HubPromptTemplate.create({ ...newPrompt, active:true, featured:false, sort_order:prompts.length + 1 });
    setNewPrompt({ category:'Build', title:'', description:'', prompt:'' }); await refresh(); setNotice('Prompt added.');
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#168FEA] text-lg font-black text-white">G</div>
              <div><div className="font-black leading-tight">GLAM Hub</div><div className="text-xs font-bold text-[#168FEA]">ADMIN</div></div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {nav.map(([id,label,Icon]) => <button key={id} onClick={()=>setTab(id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${tab===id?'bg-blue-50 text-[#168FEA]':'text-slate-600 hover:bg-slate-50'}`}><Icon size={18}/>{label}</button>)}
          </nav>
          <div className="border-t border-slate-100 p-3">
            <a href="/hub.html" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"><ExternalLink size={18}/>Open Learning Hub</a>
            <button onClick={()=>logout()} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"><LogOut size={18}/>Sign out</button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div><div className="text-xs font-black uppercase tracking-[.16em] text-[#168FEA]">GLAM ChatGPT Learning Hub</div><h1 className="text-2xl font-black">Admin</h1></div>
              <div className="flex items-center gap-2">
                <a href="/hub.html" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#103B63]">View Hub</a>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {nav.map(([id,label,Icon]) => <button key={id} onClick={()=>setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${tab===id?'bg-[#168FEA] text-white':'bg-slate-100 text-slate-700'}`}><Icon size={14}/>{label}</button>)}
            </div>
          </header>

          <div className="mx-auto max-w-7xl p-4 lg:p-8">
            {notice && <div className="mb-4 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800"><span>{notice}</span><button onClick={()=>setNotice('')}>×</button></div>}
            {loading ? <div className="grid min-h-[45vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-[#168FEA]"/></div> : <>

              {tab==='dashboard' && <div className="space-y-6">
                <div><h2 className="text-3xl font-black">Your Hub at a glance</h2><p className="mt-1 text-slate-500">The important stuff first. No digging.</p></div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Stat label="Registered users" value={users.length}/>
                  <Stat label="Live lessons" value={activeLessons} sub={`${lessons.length} total`}/>
                  <Stat label="Prompt records" value={prompts.length}/>
                  <Stat label="Active announcements" value={activeAnnouncements}/>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-lg font-black">Quick actions</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><button onClick={()=>setTab('announcements')} className="rounded-2xl bg-[#168FEA] px-4 py-4 text-left font-black text-white">Post an announcement</button><button onClick={()=>setTab('prompts')} className="rounded-2xl border border-slate-200 px-4 py-4 text-left font-black text-[#103B63]">Add a prompt</button><button onClick={()=>setTab('lessons')} className="rounded-2xl border border-slate-200 px-4 py-4 text-left font-black text-[#103B63]">Manage lessons</button><a href="/hub.html" className="rounded-2xl border border-slate-200 px-4 py-4 text-left font-black text-[#103B63]">Open the Hub</a></div></section>
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-lg font-black">Admin access</h3><p className="mt-2 text-sm leading-6 text-slate-500">Signed in as <strong className="text-slate-900">{user.email || user.full_name || 'Admin'}</strong>. This page is restricted to Base44 users with the admin role.</p><div className="mt-4"><Pill tone="green">Admin only</Pill></div></section>
                </div>
              </div>}

              {tab==='users' && <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-3xl font-black">Users</h2><p className="text-slate-500">People registered with the app.</p></div><SearchBox value={search} onChange={setSearch}/></div><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Joined</th></tr></thead><tbody>{filteredUsers.map(u=><tr key={u.id} className="border-t border-slate-100"><td className="p-4"><div className="font-bold">{u.full_name || u.name || 'User'}</div><div className="text-xs text-slate-500">{u.email}</div></td><td className="p-4"><Pill tone={u.role==='admin'?'blue':'gray'}>{u.role || 'user'}</Pill></td><td className="p-4 text-slate-500">{u.created_date ? new Date(u.created_date).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div></div></div>}

              {tab==='lessons' && <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-3xl font-black">Lessons</h2><p className="text-slate-500">All 29 current Hub lessons are loaded here.</p></div><SearchBox value={search} onChange={setSearch}/></div><div className="grid gap-3">{filteredLessons.map(l=><div key={l.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center gap-3"><div className="min-w-[220px] flex-1"><div className="text-xs font-black uppercase tracking-wider text-[#168FEA]">{l.lesson_id}</div><div className="font-black">{l.title}</div></div><select value={l.level || ''} onChange={e=>patch('HubLessonAdmin',l.id,{level:e.target.value})} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select><button onClick={()=>patch('HubLessonAdmin',l.id,{featured:!l.featured})} className={`rounded-xl border px-3 py-2 ${l.featured?'border-amber-300 bg-amber-50 text-amber-700':'border-slate-200 text-slate-500'}`} title="Featured"><Star size={17} fill={l.featured?'currentColor':'none'}/></button><button onClick={()=>patch('HubLessonAdmin',l.id,{active:!l.active})} className={`rounded-xl border px-3 py-2 ${l.active?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-slate-200 bg-slate-50 text-slate-500'}`}>{l.active?<Eye size={17}/>:<EyeOff size={17}/>}</button></div></div>)}</div></div>}

              {tab==='prompts' && <div className="space-y-6"><div><h2 className="text-3xl font-black">Prompt Library</h2><p className="text-slate-500">Add and manage admin prompt records from one place.</p></div><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-black">Add a prompt</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><input className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Category" value={newPrompt.category} onChange={e=>setNewPrompt({...newPrompt,category:e.target.value})}/><input className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Prompt title" value={newPrompt.title} onChange={e=>setNewPrompt({...newPrompt,title:e.target.value})}/><input className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder="Short description" value={newPrompt.description} onChange={e=>setNewPrompt({...newPrompt,description:e.target.value})}/><textarea className="min-h-32 rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder="Full copy-ready prompt" value={newPrompt.prompt} onChange={e=>setNewPrompt({...newPrompt,prompt:e.target.value})}/></div><button onClick={addPrompt} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#168FEA] px-5 py-3 text-sm font-black text-white"><Plus size={16}/>Add Prompt</button></section><div className="grid gap-3">{prompts.map(p=><div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start gap-3"><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><Pill>{p.category || 'Prompt'}</Pill>{p.featured&&<Pill tone="green">Featured</Pill>}</div><div className="mt-2 font-black">{p.title}</div><div className="mt-1 text-sm text-slate-500">{p.description}</div></div><button onClick={()=>patch('HubPromptTemplate',p.id,{featured:!p.featured})} className="rounded-xl border border-slate-200 p-2"><Star size={17}/></button><button onClick={()=>remove('HubPromptTemplate',p.id)} className="rounded-xl border border-rose-200 p-2 text-rose-600"><Trash2 size={17}/></button></div></div>)}</div></div>}

              {tab==='announcements' && <div className="space-y-6"><div><h2 className="text-3xl font-black">Announcements</h2><p className="text-slate-500">Create the messages you want available for the Hub.</p></div><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row"><input value={newAnnouncement} onChange={e=>setNewAnnouncement(e.target.value)} placeholder="Type a new announcement…" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3"/><button onClick={addAnnouncement} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#168FEA] px-5 py-3 font-black text-white"><Plus size={17}/>Add</button></div></section><div className="grid gap-3">{announcements.map(a=><div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start gap-3"><div className="flex-1"><div className="font-bold">{a.message}</div><div className="mt-2"><Pill tone={a.active?'green':'gray'}>{a.active?'Active':'Hidden'}</Pill></div></div><button onClick={()=>patch('HubAnnouncement',a.id,{active:!a.active})} className="rounded-xl border border-slate-200 p-2">{a.active?<Eye size={17}/>:<EyeOff size={17}/>}</button><button onClick={()=>remove('HubAnnouncement',a.id)} className="rounded-xl border border-rose-200 p-2 text-rose-600"><Trash2 size={17}/></button></div></div>)}</div></div>}

              {tab==='settings' && <SettingsPanel settings={settings} refresh={refresh} setNotice={setNotice}/>} 
            </>}
          </div>
        </main>
      </div>
    </div>
  );
}

function SearchBox({ value, onChange }) {
  return <label className="flex w-full max-w-xs items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><Search size={17} className="text-slate-400"/><input value={value} onChange={e=>onChange(e.target.value)} placeholder="Search…" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>;
}

function SettingsPanel({ settings, refresh, setNotice }) {
  const defaults = [
    ['business_email','Business Email','glamorousgrammyglowup@gmail.com','Contact'],
    ['shop_url','Shop More URL','https://glamhustlehub.com','Links'],
    ['vault_url','The Glam Vault URL','https://payhip.com/b/54LoK','Links'],
    ['tiktok_url','TikTok URL','https://www.tiktok.com/@promptlikeglam','Social'],
    ['youtube_url','YouTube URL','https://www.youtube.com/@Glamorousaiprompts','Social'],
    ['facebook_url','Facebook URL','https://www.facebook.com/GlamAIForBeginners','Social'],
    ['instagram_url','Instagram URL','https://www.instagram.com/glam_ai_for_beginners/','Social'],
    ['pinterest_url','Pinterest URL','https://www.pinterest.com/glamaiforbeginners/','Social'],
  ];
  const [vals, setVals] = useState({});
  useEffect(()=>{ const next={}; defaults.forEach(([k,,v])=>next[k]=settings.find(s=>s.key===k)?.value || v); setVals(next); },[settings.length]);

  async function saveAll() {
    for (let i=0;i<defaults.length;i++) {
      const [key,label,,group] = defaults[i]; const existing=settings.find(s=>s.key===key);
      if (existing) await base44.entities.HubAdminSetting.update(existing.id,{value:vals[key],label,group,sort_order:i+1});
      else await base44.entities.HubAdminSetting.create({key,label,value:vals[key] || '',group,sort_order:i+1});
    }
    await refresh(); setNotice('Settings saved.');
  }

  return <div className="space-y-6"><div><h2 className="text-3xl font-black">Settings</h2><p className="text-slate-500">Your common business and social links in one place.</p></div><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 md:grid-cols-2">{defaults.map(([key,label])=><label key={key} className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span><input value={vals[key] || ''} onChange={e=>setVals({...vals,[key]:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>)}</div><button onClick={saveAll} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#168FEA] px-5 py-3 text-sm font-black text-white"><Save size={16}/>Save Settings</button></section></div>;
}
