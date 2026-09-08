import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Saved Prompt Concierge project threads (HubProject entity).
// Op-based CRUD, run as the authenticated user so the entity's owner-only RLS applies.
//
// Request shape (shared with public/hub-projects.js):
//   { op: "list" }
//   { op: "create", fields: { name, category, status, master_prompt, ... } }
//   { op: "update", id, fields: { ... } }
//   { op: "delete", id }
// The project data is always nested under `fields` for create/update.
export default async function hubProjects(req: Request): Promise<Response> {
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
    const op = typeof body?.op === "string" ? body.op.trim() : "";

    if (op === "list") {
      const items = await base44.entities.HubProject.list("-created_date", 200);
      return Response.json({ ok: true, data: items });
    }

    if (op === "create") {
      const fields = pickFields(body?.fields);
      if (!fields.name || !String(fields.name).trim()) {
        return Response.json({ error: "A project name is required." }, { status: 400 });
      }
      const created = await base44.entities.HubProject.create(fields);
      return Response.json({ ok: true, data: created });
    }

    if (op === "update") {
      const id = typeof body?.id === "string" ? body.id.trim() : "";
      if (!id) {
        return Response.json({ error: "A project id is required." }, { status: 400 });
      }
      const fields = pickFields(body?.fields);
      const updated = await base44.entities.HubProject.update(id, fields);
      return Response.json({ ok: true, data: updated });
    }

    if (op === "delete") {
      const id = typeof body?.id === "string" ? body.id.trim() : "";
      if (!id) {
        return Response.json({ error: "A project id is required." }, { status: 400 });
      }
      await base44.entities.HubProject.delete(id);
      return Response.json({ ok: true });
    }

    return Response.json(
      { error: "Unknown operation. Use list, create, update, or delete." },
      { status: 400 },
    );
  } catch (error) {
    console.error("hubProjects failed", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The saved project request could not complete right now.",
      },
      { status: 500 },
    );
  }
}

// Reads project fields from the nested `fields` object sent by the frontend.
// Only known fields are copied through, with the same length caps the schema implies.
function pickFields(src: any): Record<string, any> {
  const str = (v: any) => (typeof v === "string" ? v : "");
  const body = src && typeof src === "object" ? src : {};
  const out: Record<string, any> = {};
  if ("name" in body) out.name = str(body.name).slice(0, 200);
  if ("category" in body) out.category = str(body.category).slice(0, 100);
  if ("status" in body) out.status = str(body.status).slice(0, 50);
  if ("master_prompt" in body) out.master_prompt = str(body.master_prompt);
  if ("summary" in body) out.summary = str(body.summary);
  if ("recommended_workspace" in body)
    out.recommended_workspace = str(body.recommended_workspace).slice(0, 100);
  if ("workspace_reason" in body)
    out.workspace_reason = str(body.workspace_reason);
  if ("conversation_history" in body)
    out.conversation_history = str(body.conversation_history);
  if ("source" in body) out.source = str(body.source).slice(0, 100);
  return out;
}