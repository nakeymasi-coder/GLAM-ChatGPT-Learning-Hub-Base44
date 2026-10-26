import { createClientFromRequest } from "npm:@base44/sdk";
import { hasLegacyAccess, normalizeEmail, PRODUCT_ID, verifyAssertion } from "./policy.mjs";
const reply = (data:unknown,status=200) => Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
const trustedOrigins = new Set(["https://glamhustlehub.com","https://www.glamhustlehub.com","https://glam-hustle-hub-staging.lovable.app","https://project--432e8192-bce2-40dd-b3b1-ac09f8662742.lovable.app"]);
function origin() {
  const value = Deno.env.get("HUB_STORE_ORIGIN") || "";
  if (!trustedOrigins.has(value)) throw new Error("Store connection not configured.");
  return value;
}
async function storeRequest(path:string, body:unknown, grant?:string) {
  const response = await fetch(origin()+path, {method:"POST",headers:{"Content-Type":"application/json",...(grant?{Authorization:"Bearer "+grant}:{})},body:JSON.stringify(body),redirect:"error",signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error("Purchase access could not be confirmed. Open a fresh link from your store library.");
  return response.json();
}
export default async function hubAccess(req:Request):Promise<Response> {
  if(req.method!=="POST") return reply({error:"Method not allowed."},405);
  const client = createClientFromRequest(req);
  let user;
  try {user=await client.auth.me();} catch {return reply({error:"Please sign in."},401);}
  if(!user?.id || !user.email) return reply({error:"Please sign in."},401);
  const body = await req.json().catch(()=>null);
  const op = body?.op;
  if(op!=="check" && op!=="claim") return reply({error:"Invalid request."},400);
  // Rollout remains off until published endpoints and buyer tests are verified.
  const enabled = Deno.env.get("HUB_STORE_ACCESS_ENABLED")==="true";
  if(op==="check" && (!enabled || hasLegacyAccess(user))) return reply({active:true,source:hasLegacyAccess(user)?"existing-account":"rollout-pending"});
  if(!enabled) return reply({error:"The store connection is being prepared. Please contact Glam for help."},503);
  try {
    const grants = client.asServiceRole.entities.HubStoreGrant;
    if(op==="claim") {
      const keyResponse=await fetch(origin()+"/api/public/access/jwks",{redirect:"error",signal:AbortSignal.timeout(10000)});
      if(!keyResponse.ok) throw new Error("Store connection unavailable.");
      const claims=await verifyAssertion(body.token,await keyResponse.json(),user.email,"live");
      const exchanged=await storeRequest("/api/public/access/exchange",{token:body.token});
      if(exchanged.mode!=="live" || exchanged.product_id!==PRODUCT_ID || exchanged.sub!==claims.sub || normalizeEmail(exchanged.email)!==normalizeEmail(user.email) || typeof exchanged.grant!=="string" || exchanged.grant.length<32) throw new Error("Purchase identity mismatch.");
      const prior=await grants.filter({user_id:user.id,product_id:PRODUCT_ID,mode:"live"},"-created_date",1);
      const record={user_id:user.id,buyer_email:normalizeEmail(user.email),store_subject:claims.sub,grant_credential:exchanged.grant,mode:"live",product_id:PRODUCT_ID,status:"active"};
      if(prior[0]) await grants.update(prior[0].id,record); else await grants.create(record);
      return reply({active:true});
    }
    const records=await grants.filter({user_id:user.id,product_id:PRODUCT_ID,mode:"live",status:"active"},"-created_date",1);
    const record=records[0];
    if(!record || normalizeEmail(record.buyer_email)!==normalizeEmail(user.email)) return reply({active:false},403);
    // Recheck every protected request; do not serve access from a stale local grant.
    const current=await storeRequest("/api/public/access/status",{},record.grant_credential);
    const active=current.active===true && current.mode==="live" && current.product_id===PRODUCT_ID;
    if(!active) await grants.update(record.id,{status:"revoked"});
    return reply({active},active?200:403);
  } catch {
    // Provider exceptions may include credentials. Never log or echo them.
    return reply({error:"We couldn’t verify this purchase. Sign in with your checkout email and open a fresh link from your store library.",active:false},403);
  }
}
