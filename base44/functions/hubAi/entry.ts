import { createClientFromRequest } from "npm:@base44/sdk";

export default async function hubAi(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
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
