import { createClientFromRequest } from 'npm:@base44/sdk@0.8.50';
import { experimental_evaluate as evaluate } from 'npm:ai@7.0.105';
import { createTypeSafeAi } from 'npm:@ai-sdk/typesafe-ai@3.0.4';

export default async function agentRoute(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });
    const { message } = await req.json();
    if (typeof message !== 'string' || !message.trim() || message.length > 4000) return Response.json({ error: 'Enter a request (up to 4,000 characters).' }, { status: 400 });
    const { baseURL, token } = base44.asServiceRole.aiGateway.connection({ provider: 'typesafe' });
    const typesafe = createTypeSafeAi({ baseURL, apiKey: token });
    const result = await evaluate({
      model: typesafe.evaluationModel('jev'), maxRetries: 0,
      state: { message },
      questions: { destination: { type: 'choice', instructions: 'Choose the single best Agent Center section for this request. If uncertain, choose advisor.', criteria: {
        advisor: 'Needs advice on which ChatGPT product, tool, mode, reasoning level, or workflow to use for a task.',
        teacher: 'Wants to learn a ChatGPT concept or get an explanation or tutorial.',
        intelligence: 'Wants news or recent ChatGPT/OpenAI changes, not a general lesson.',
        agent: 'Wants to find repeated work patterns or create a reusable master prompt.',
        vault: 'Wants to find, use, copy, or edit a previously saved master prompt.'
      } } }
    });
    const destination = result.answers?.destination?.choice;
    return Response.json({ destination: ['advisor','teacher','intelligence','agent','vault'].includes(destination) ? destination : 'advisor' });
  } catch (error) {
    console.error('agentRoute failed', error);
    return Response.json({ error: 'Could not route your request. Choose a section below instead.' }, { status: 500 });
  }
}