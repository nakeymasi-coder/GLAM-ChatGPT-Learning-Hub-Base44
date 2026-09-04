import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export default function Home() {
  const iframeRef = useRef(null);

  useEffect(() => {
    const onMessage = async (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || message.type !== 'glamAskRequest') return;

      const requestId = message.requestId;
      const payload = message.payload || {};
      const question = String(payload.question || '').trim().slice(0, 6000);
      const history = Array.isArray(payload.history) ? payload.history.slice(-8) : [];
      const catalog = Array.isArray(payload.catalog) ? payload.catalog.slice(0, 80) : [];

      if (!question) {
        iframeRef.current?.contentWindow?.postMessage({
          type: 'glamAskResponse',
          requestId,
          ok: false,
          error: 'Please tell me what you are trying to do first.',
        }, '*');
        return;
      }

      try {
        const response = await base44.functions.invoke('askHub', {
          question,
          history,
          catalog,
        });
        const result = response?.data ?? response;

        iframeRef.current?.contentWindow?.postMessage({
          type: 'glamAskResponse',
          requestId,
          ok: true,
          data: result,
        }, '*');
      } catch (error) {
        iframeRef.current?.contentWindow?.postMessage({
          type: 'glamAskResponse',
          requestId,
          ok: false,
          error: error?.message || 'The Learning Hub AI could not answer right now.',
        }, '*');
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-white">
      <iframe
        ref={iframeRef}
        src="/hub.html"
        title="GLAM ChatGPT Learning Hub"
        className="h-full w-full border-0"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
