import { createClientFromRequest } from 'npm:@base44/sdk@0.8.51';
export default async function markProjectReady(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return Response.json({error:'Method not allowed'},{status:405});
    const base44=createClientFromRequest(req);
    const user=await base44.auth.me();
    if(!user) return Response.json({error:'Sign in required'},{status:401});
    if (Deno.env.get("HUB_STORE_ACCESS_ENABLED") === "true") {
      try {
        const accessResponse = await base44.functions.invoke("hubAccess", { op: "check" });
        const access = accessResponse?.data ?? accessResponse;
        if (access?.active !== true) return Response.json({ error: "Open the Hub from your store purchase library to confirm access." }, { status: 403 });
      } catch {
        return Response.json({ error: "Purchase access could not be verified." }, { status: 403 });
      }
    }

    const body=await req.json();
    const id=typeof body?.project_id==='string'?body.project_id.trim():'';
    if(!id||id.length>100) return Response.json({error:'Invalid project'},{status:400});
    let project;
    try { project=await base44.entities.HubProject.get(id); }
    catch(error){ if(String(error).toLowerCase().includes('not found')) return Response.json({error:'Project not found'},{status:404}); throw error; }
    if(!project||project.created_by_id!==user.id) return Response.json({error:'Project not found'},{status:404});
    if(project.status!=='Ready to Use') return Response.json({ok:true,marked:false});
    if(project.ready_at && new Date(project.ready_at).getTime()>=new Date(project.updated_date).getTime()-2000) return Response.json({ok:true,marked:false});
    const updated=await base44.entities.HubProject.update(id,{ready_at:new Date().toISOString()});
    return Response.json({ok:true,marked:true,ready_at:updated.ready_at});
  } catch(error){console.error('markProjectReady failed',error);return Response.json({error:error instanceof Error?error.message:'Could not mark project ready'},{status:500});}
}