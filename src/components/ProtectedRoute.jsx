import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { hasCurrentLegalAcceptance } from '@/lib/legalAcceptance';
import { base44 } from '@/api/base44Client';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { user, isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();
  const location = useLocation();
  const [consent, setConsent] = useState({ userId: null, status: 'loading' });

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) checkUserAuth();
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let active = true;
    setConsent({ userId: user.id, status: 'loading' });
    hasCurrentLegalAcceptance(user.id)
      .then(accepted => { if (active) setConsent({ userId: user.id, status: accepted ? 'accepted' : 'required' }); })
      .catch(error => { if (active) setConsent({ userId: user.id, status: 'error', error: error.message }); });
    return () => { active = false; };
  }, [isAuthenticated, user?.id]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) return unauthenticatedElement;
  if (consent.userId !== user?.id || consent.status === 'loading') return fallback;
  if (consent.status === 'error') return <div className="mx-auto max-w-md p-6 text-foreground" role="alert"><p>Could not verify your legal acceptance: {consent.error}</p><button className="mt-3 rounded-lg border border-border px-4 py-2" onClick={() => { setConsent({ userId: user.id, status: 'loading' }); hasCurrentLegalAcceptance(user.id).then(accepted => setConsent({ userId: user.id, status: accepted ? 'accepted' : 'required' })).catch(error => setConsent({ userId: user.id, status: 'error', error: error.message })); }}>Try again</button></div>;
  if (consent.status === 'required') {
    const returnTo = location.pathname + location.search + location.hash;
    return <Navigate to={`/legal-consent?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  return <Outlet />;
}