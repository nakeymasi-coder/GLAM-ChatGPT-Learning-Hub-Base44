import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
const KEY = "glam_hub_pending_claim";
if (window.location.pathname === "/access/claim" && window.location.hash) {
  const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
  if (token && token.length <= 12000) sessionStorage.setItem(KEY, JSON.stringify({token, at:Date.now()}));
  window.history.replaceState(null, "", "/access/claim");
}
export default function ClaimHubAccess() {
  const [message,setMessage] = useState("Checking your purchase access…");
  const [login,setLogin] = useState(false);
  useEffect(() => {
    let active = true;
    async function claim() {
      let pending;
      try { pending = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { /* Invalid local state. */ }
      if (!pending?.token || !Number.isFinite(pending.at) || Date.now()-pending.at > 300000) {
        sessionStorage.removeItem(KEY);
        if(active) setMessage("This link has expired. Open the Hub again from your store purchase library.");
        return;
      }
      try { await base44.auth.me(); } catch {
        if(active){setMessage("Sign in with the same email you used at checkout.");setLogin(true);}
        return;
      }
      try {
        const response = await base44.functions.invoke("hubAccess", {op:"claim",token:pending.token});
        const result = response?.data ?? response;
        if (!result?.active) throw new Error("Access not confirmed.");
        sessionStorage.removeItem(KEY);
        if(active) window.location.replace("/hub.html");
      } catch {
        if(active) setMessage("We couldn’t connect this purchase. Check your checkout email and open a fresh link from your store library. Contact Glam if you need help.");
      }
    }
    claim();
    return () => { active = false; };
  },[]);
  return <main className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-6">
    <section className="w-full max-w-lg rounded-2xl border border-slate-200 p-8 shadow-sm">
      <p className="text-sm font-semibold text-blue-600">Glam Hustle Hub</p>
      <h1 className="mt-3 text-2xl font-bold">Your ChatGPT Mastery Hub access</h1>
      <p className="mt-4" role="status">{message}</p>
      {login && <a className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white" href="/login?returnTo=%2Faccess%2Fclaim">Sign in to connect my purchase</a>}
      <p className="mt-6"><a className="underline" href="https://glamhustlehub.com/account">Return to my store library</a></p>
    </section>
  </main>;
}
