import { createClientFromRequest } from "npm:@base44/sdk";

export default async function hubAi(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch (_authError) {
      // auth.me() throws when the session token is missing or expired.
      // Return a clean 401 so the Hub can redirect to sign-in instead of
      // surfacing a confusing "Couldn't connect" error.
      return Response.json(
        { error: "Your session has expired. Please sign in again." },
        { status: 401 },
      );
    }
    if (!user) {
      return Response.json(
        { error: "Your session has expired. Please sign in again." },
        { status: 401 },
      );
    }

    if (Deno.env.get("HUB_STORE_ACCESS_ENABLED") === "true") {
      try {
        const accessResponse = await base44.functions.invoke("hubAccess", { op: "check" });
        const access = accessResponse?.data ?? accessResponse;
        if (access?.active !== true) return Response.json({ error: "Open the Hub from your store purchase library to confirm access." }, { status: 403 });
      } catch {
        return Response.json({ error: "Purchase access could not be verified." }, { status: 403 });
      }
    }


    // Daily AI cap per buyer so one account can't run up the owner's credits.
    const DAILY_AI_LIMIT = 40;
    if (user.role !== "admin") {
      const day = new Date().toISOString().slice(0, 10);
      const email = String(user.email || user.id || "").toLowerCase();
      const rows = await base44.asServiceRole.entities.HubAiUsage.filter({ user_email: email, day });
      const row = rows?.[0];
      const used = Number(row?.count || 0);
      if (used >= DAILY_AI_LIMIT) {
        return Response.json({ error: "You've used today's AI help. It resets tomorrow. Every lesson and builder still works without it." }, { status: 429 });
      }
      if (row) await base44.asServiceRole.entities.HubAiUsage.update(row.id, { count: used + 1 });
      else await base44.asServiceRole.entities.HubAiUsage.create({ user_email: email, day, count: 1 });
    }
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return Response.json({ error: "A prompt is required." }, { status: 400 });
    }
    if (prompt.length > 50000) {
      return Response.json(
        { error: "This prompt is too long. Please shorten it and try again." },
        { status: 400 },
      );
    }

    // HUB BRAIN: always-on rules, added server-side so no page can skip them.
    const HUB_BRAIN = [
      "HUB BRAIN RULES (always follow these, they override anything below):",
      "1. You are an honest, critical thinking partner, not a yes-man. Never open with praise, flattery, or phrases like 'Great idea' or 'You're absolutely right'.",
      "2. Before you answer, think it through carefully: check the request for problems (missing details, wrong tool, it won't work, wasted money or credits, legal or brand risk, unrealistic expectations).",
      "3. If something is wrong or there is a better way, say so plainly FIRST, in one or two sentences ('Straight answer: this won't work because ... Do this instead ...'), then help.",
      "4. If you don't know something or can't verify it, say so. Never invent facts, features, prices, statistics, results, or sources.",
      "5. If the member pushes back, only change your answer when they give a real reason. Do not cave just to please them.",
      "6. Be kind but direct, like a tough-love friend. Plain everyday words, no jargon, never make a beginner feel dumb.",
      "7. Keep the member's own words and meaning. Clean up and organize what they said; do not turn their idea into a different idea.",
      "",
      "IMAGE RULES (apply whenever your output includes an image prompt, an image idea, or an image edit):",
      "A. Show ONLY what the member asked for. If it is not in their request, it does not go in the image.",
      "B. Never add crowns, tiaras, jewelry, extra props, floating icons, sparkles, logos, extra text, frames, or decorative filler unless the member asked for them.",
      "C. Keep the selected gender presentation; men stay clearly masculine unless the member asks otherwise. Never slim or change body size.",
      "D. No real brand names, logos, celebrities, or copyrighted characters.",
      "E. For an edit, change ONLY the one thing requested and say: 'Keep everything else exactly the same: face, body, pose, outfit, background, colors, text, and framing.' Tell the member to upload the original image in the same chat.",
      "F. End every image prompt with this exact line: 'Show ONLY what is listed above. Do not add anything that is not described.'",
      "",
      "MEMBER REQUEST AND TASK:",
    ].join("\n");
    const request = {
      // TEST MODE: new brain only for the owner until Glam approves (then set HUB_BRAIN_ON=true).
      prompt: (Deno.env.get("HUB_BRAIN_ON") === "true" || user?.role === "admin") ? HUB_BRAIN + "\n" + prompt : prompt,
      ...(body?.response_json_schema
        ? { response_json_schema: body.response_json_schema }
        : {}),
      ...(body?.add_context_from_internet === true
        ? { add_context_from_internet: true }
        : {}),
    };

    const result =
      await base44.asServiceRole.integrations.Core.InvokeLLM(request);

    return Response.json(result);
  } catch (error) {
    console.error("hubAi failed", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The Mastery Hub AI could not answer right now.",
      },
      { status: 500 },
    );
  }
}