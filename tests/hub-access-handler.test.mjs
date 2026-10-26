import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {hasLegacyAccess,normalizeEmail,PRODUCT_ID,verifyAssertion} from "../base44/functions/hubAccess/policy.mjs";
const raw=readFileSync(new URL("../base44/functions/hubAccess/entry.ts",import.meta.url),"utf8");
const source=ts.transpileModule(raw.replace(/^import .*;\n/gm,"").replace("export default async function","async function"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
function setup({user={id:"new",email:"buyer@example.com"},enabled=true,records=[],remote={active:true,mode:"live",product_id:PRODUCT_ID},fail=false}={}){
 let updates=0,fetches=0;
 const db={filter:async()=>records,update:async()=>{updates++},create:async()=>{}};
 const client={auth:{me:async()=>user},asServiceRole:{entities:{HubStoreGrant:db}}};
 const handler=new Function("createClientFromRequest","hasLegacyAccess","normalizeEmail","PRODUCT_ID","verifyAssertion","Deno","fetch",source+";return hubAccess;")(()=>client,hasLegacyAccess,normalizeEmail,PRODUCT_ID,verifyAssertion,{env:{get:k=>k==="HUB_STORE_ACCESS_ENABLED"?(enabled?"true":"false"):"https://glamhustlehub.com"}},async()=>{fetches++;if(fail)throw new Error("sensitive-provider-error");return Response.json(remote)});
 return {call:async(body={op:"check"})=>handler(new Request("https://hub.test",{method:"POST",body:JSON.stringify(body)})),stats:()=>({updates,fetches})};
}
const grant={id:"g",buyer_email:"buyer@example.com",grant_credential:"not-a-real-credential"};
test("anonymous denied",async()=>assert.equal((await setup({user:null}).call()).status,401));
test("existing account kept without store request",async()=>{const s=setup({user:{id:"6aa859f37eaf892959d710e0",email:"existing@example.com"}});assert.equal((await (await s.call()).json()).active,true);assert.equal(s.stats().fetches,0);});
test("new unpaid account denied",async()=>assert.equal((await setup().call()).status,403));
test("live valid grant accepted only after server status",async()=>{const s=setup({records:[grant]});assert.equal((await (await s.call()).json()).active,true);assert.equal(s.stats().fetches,1);});
test("refund revokes grant",async()=>{const s=setup({records:[grant],remote:{active:false,mode:"live",product_id:PRODUCT_ID}});assert.equal((await s.call()).status,403);assert.equal(s.stats().updates,1);});
test("test mode rejected",async()=>assert.equal((await setup({records:[grant],remote:{active:true,mode:"test",product_id:PRODUCT_ID}}).call()).status,403));
test("wrong account denied before remote lookup",async()=>{const s=setup({records:[{...grant,buyer_email:"other@example.com"}]});assert.equal((await s.call()).status,403);assert.equal(s.stats().fetches,0);});
test("store outage fails closed without secrets in response",async()=>{const r=await setup({records:[grant],fail:true}).call();assert.equal(r.status,403);assert.ok(!(await r.text()).includes("sensitive-provider-error"));});
test("rollout off preserves current access but cannot claim",async()=>{const s=setup({enabled:false});assert.equal((await (await s.call()).json()).active,true);assert.equal((await s.call({op:"claim",token:"invalid"})).status,503);});
