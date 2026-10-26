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

    const request = {
      prompt,
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
            : "The Learning Hub AI could not answer right now.",
      },
      { status: 500 },
    );
  }
}