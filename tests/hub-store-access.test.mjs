import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { verifyAssertion, hasLegacyAccess, PRODUCT_ID, ISSUER, AUDIENCE } from "../base44/functions/hubAccess/policy.mjs";
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const pair = await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
const jwk = await crypto.subtle.exportKey("jwk",pair.publicKey);
jwk.kid = "unit-test-only"; jwk.alg = "RS256";
const jwks = {keys:[jwk]};
const encode = obj => Buffer.from(JSON.stringify(obj)).toString("base64url");
const claims = {iss:ISSUER,aud:AUDIENCE,product_id:PRODUCT_ID,mode:"live",email:"buyer@example.com",sub:"buyer",jti:"one-time-id",iat:1000,exp:1300};
async function sign(changes={},header={alg:"RS256",kid:jwk.kid}) {
 const input = encode(header)+"."+encode({...claims,...changes});
 const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5",pair.privateKey,new TextEncoder().encode(input));
 return input+"."+Buffer.from(sig).toString("base64url");
}
test("valid buyer and case-normalized email",async()=>assert.equal((await verifyAssertion(await sign(),jwks,"BUYER@example.com","live",1100)).sub,"buyer"));
for(const [name,changes] of Object.entries({expired:{exp:1099},future:{iat:1200},tooLong:{exp:1400},wrongProduct:{product_id:"other"},wrongAudience:{aud:"other"},wrongIssuer:{iss:"other"},testPurchase:{mode:"test"},noId:{jti:""}})){
 test("rejects "+name,async()=>await assert.rejects(verifyAssertion(await sign(changes),jwks,"buyer@example.com","live",1100)));
}
test("rejects another buyer",async()=>await assert.rejects(verifyAssertion(await sign(),jwks,"other@example.com","live",1100)));
test("rejects changed signature",async()=>{const token=await sign();const parts=token.split(".");parts[1]=encode({...claims,email:"attacker@example.com"});await assert.rejects(verifyAssertion(parts.join("."),jwks,"attacker@example.com","live",1100));});
test("rejects algorithm substitution",async()=>await assert.rejects(verifyAssertion(await sign({}, {alg:"none",kid:jwk.kid}),jwks,"buyer@example.com","live",1100)));
test("unknown keys fail closed",async()=>await assert.rejects(verifyAssertion(await sign(),{keys:[]},"buyer@example.com","live",1100)));
test("existing account retained; new account and fake old date not retained",()=>{assert.equal(hasLegacyAccess({id:"6aa859f37eaf892959d710e0",role:"user"}),true);assert.equal(hasLegacyAccess({id:"new",role:"user",created_date:"2000-01-01"}),false);assert.equal(hasLegacyAccess(null),false);});
