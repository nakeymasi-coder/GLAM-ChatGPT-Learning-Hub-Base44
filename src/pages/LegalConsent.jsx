import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import { TERMS_VERSION, PRIVACY_VERSION, hasCurrentLegalAcceptance } from '@/lib/legalAcceptance';

function safeDestination(value) {
  if (!value) return "/hub.html";
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "/hub.html";
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "/hub.html";
    return path;
  } catch {
    return "/hub.html";
  }
}

export default function LegalConsent() {
  const { user, authChecked, navigateToLogin } = useAuth();
  const [params] = useSearchParams();
  const destination = useMemo(() => safeDestination(params.get("returnTo")), [params]);
  const [checked, setChecked] = useState(false);
  const [document, setDocument] = useState('terms');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authChecked && !user) navigateToLogin();
  }, [authChecked, user, navigateToLogin]);

  useEffect(() => {
    let active = true;
    async function checkAcceptance() {
      if (!user) return;
      setLoading(true);
      try {
        const accepted = await hasCurrentLegalAcceptance(user.id);
        if (accepted) {
          window.location.replace(destination);
          return;
        }
      } catch (err) {
        if (active) setError(err?.message || "Could not verify your legal acceptance status.");
      } finally {
        if (active) setLoading(false);
      }
    }
    checkAcceptance();
    return () => { active = false; };
  }, [user, destination]);

  async function accept() {
    if (!checked || !user) return;
    setSaving(true);
    setError("");
    try {
      await base44.entities.LegalAcceptance.create({
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
        accepted_at: new Date().toISOString(),
        acceptance_method: "required_clickwrap"
      });
      window.location.replace(destination);
    } catch (err) {
      setError(err?.message || "Could not save your acceptance. Please try again.");
      setSaving(false);
    }
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#168FEA]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#168FEA] text-white">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="mt-5 text-center">
          <div className="text-xs font-black uppercase tracking-[.18em] text-[#168FEA]">GLAM ChatGPT Learning Hub</div>
          <h1 className="mt-2 text-3xl font-black">One required step before entering</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Please review and accept the current Terms & Conditions and Privacy Policy. Access to the Hub is blocked until acceptance is recorded for your account.
          </p>
        </div>

        <div className="mt-6 flex gap-2" role="tablist" aria-label="Legal documents">
          <button type="button" role="tab" aria-selected={document === 'terms'} onClick={() => setDocument('terms')} className={`flex-1 rounded-xl border px-3 py-3 text-sm font-bold ${document === 'terms' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-700'}`}>Terms & Conditions</button>
          <button type="button" role="tab" aria-selected={document === 'privacy'} onClick={() => setDocument('privacy')} className={`flex-1 rounded-xl border px-3 py-3 text-sm font-bold ${document === 'privacy' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-700'}`}>Privacy Policy</button>
        </div>
        <iframe title={document === 'terms' ? 'Terms and Conditions' : 'Privacy Policy'} src={document === 'terms' ? '/terms.html' : '/privacy.html'} className="mt-3 h-96 w-full rounded-xl border border-slate-200 bg-white" />
        <p className="mt-2 text-xs text-slate-600">You can also <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="underline">open the terms</a> or <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="underline">open the privacy policy</a> in a new tab.</p>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-5 w-5"
          />
          <span className="text-sm leading-6 text-slate-700">
            I am at least 18 years old, I have read and agree to the <a className="font-bold underline" href="/terms.html" target="_blank" rel="noopener noreferrer">Terms & Conditions</a>, and I acknowledge the <a className="font-bold underline" href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
          </span>
        </label>

        {error && <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <Button className="mt-5 h-12 w-full bg-[#168FEA] font-black text-white hover:bg-[#127ac8]" disabled={!checked || saving} onClick={accept}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving acceptance…</> : "I Agree — Enter the Hub"}
        </Button>

        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
          Your acceptance is recorded with the policy versions and timestamp so the Hub can verify that you agreed before use.
        </p>
      </div>
    </div>
  );
}