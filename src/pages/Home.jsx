import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    whatYouNeed: { type: 'string' },
    bestFeature: { type: 'string' },
    nextSteps: { type: 'array', items: { type: 'string' } },
    copyPrompt: { type: 'string' },
    lessonId: { type: 'string' },
    lessonTitle: { type: 'string' },
    followUp: { type: 'string' },
  },
  required: ['answer', 'whatYouNeed', 'bestFeature', 'nextSteps', 'copyPrompt', 'lessonId', 'lessonTitle', 'followUp'],
};

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
        const prompt = `You are the real-time guide inside the GLAM ChatGPT Learning Hub. Your audience is beginner-friendly and often wants practical business help. Be clear, warm, direct, and useful. Do not overwhelm the user.

Your job:
1. Understand what the user is trying to accomplish.
2. Recommend the most appropriate ChatGPT feature or workflow.
3. Give 3-5 simple next steps.
4. Write a strong copy-ready starter prompt the user can paste into ChatGPT.
5. Recommend ONE lesson from the supplied Learning Hub lesson catalog when there is a good match. Use the exact lesson id/title from the catalog. If there is no strong match, return empty strings for lessonId and lessonTitle.
6. End with one useful follow-up question or next action.

Do not claim a feature is available to every plan if availability can vary. Keep explanations beginner-friendly.

USER QUESTION:
${question}

RECENT CONVERSATION:
${JSON.stringify(history)}

LEARNING HUB LESSON CATALOG:
${JSON.stringify(catalog)}

Return structured JSON matching the requested schema.`;

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
