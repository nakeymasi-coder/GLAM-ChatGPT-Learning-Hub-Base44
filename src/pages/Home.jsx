import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    window.location.replace('/hub.html');
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-slate-900">
      <div>
        <p className="text-lg font-semibold">Opening the GLAM ChatGPT Learning Hub…</p>
        <a className="mt-3 inline-block text-blue-600 underline" href="/hub.html">Open the Hub</a>
      </div>
    </div>
  );
}
