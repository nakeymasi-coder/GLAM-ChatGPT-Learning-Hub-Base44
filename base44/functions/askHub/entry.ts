import { createClientFromRequest } from "npm:@base44/sdk";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    whatYouNeed: { type: "string" },
    bestFeature: { type: "string" },
    nextSteps: { type: "array", items: { type: "string" } },
    copyPrompt: { type: "string" },
    lessonId: { type: "string" },
    lessonTitle: { type: "string" },
    followUp: { type: "string" },
  },
  required: [
    "answer",
    "whatYouNeed",
    "bestFeature",
    "nextSteps",
    "copyPrompt",
    "lessonId",
    "lessonTitle",
    "followUp",
  ],
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const question = String(body?.question || "").trim().slice(0, 6000);
    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    const catalog = Array.isArray(body?.catalog) ? body.catalog.slice(0, 80) : [];

    if (!question) {
      return Response.json(
        { error: "Please tell me what you are trying to do first." },
        { status: 400 },
      );
    }

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

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: "gpt_5_6_sol",
      response_json_schema: RESPONSE_SCHEMA,
    });

    return Response.json(result);
  } catch (error) {
    console.error("askHub failed", error);
    return Response.json(
      { error: error?.message || "The Learning Hub AI could not answer right now." },
      { status: 500 },
    );
  }
});
