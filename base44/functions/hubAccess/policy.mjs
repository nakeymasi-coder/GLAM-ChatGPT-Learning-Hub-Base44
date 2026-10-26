export const PRODUCT_ID = "e2a6cd8a-7fde-4fba-bbb4-ca3fe9ee205c";
export const ISSUER = "glam-hustle-hub-store";
export const AUDIENCE = "glam-chatgpt-hub";
// Exact existing account IDs captured before introducing purchase checks.
// New registrations cannot obtain legacy access by choosing an earlier date.
const LEGACY_USERS = new Set(["6a9aedd73cd938f0f47b9ff9","6aa859f37eaf892959d710e0","6aa85b378f7743692d6f05f3","6aa85dfa99d8ab74cbddf2b4","6aa85ea6ec5a2b3559baf09b","6aa85f15228c37adf03fea6a","6aa8bfbdce415c814f0b1d61","6aa900dc0b4535d4144b0776"]);
export function hasLegacyAccess(user) {
  return Boolean(user?.id && (user.role === "admin" || LEGACY_USERS.has(user.id)));
}
export const normalizeEmail = value => typeof value === "string" ? value.trim().toLowerCase() : "";
function bytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid access link.");
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
export async function verifyAssertion(token, jwks, email, mode = "live", now = Math.floor(Date.now()/1000)) {
  if (typeof token !== "string" || token.length > 12000) throw new Error("Invalid access link.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid access link.");
  const header = JSON.parse(new TextDecoder().decode(bytes(parts[0])));
  const claims = JSON.parse(new TextDecoder().decode(bytes(parts[1])));
  if (header.alg !== "RS256" || typeof header.kid !== "string" || header.crit) throw new Error("Invalid signature.");
  const key = jwks?.keys?.find(k => k.kid === header.kid && k.kty === "RSA" && (!k.alg || k.alg === "RS256") && !k.d);
  if (!key) throw new Error("Unknown signing key.");
  const publicKey = await crypto.subtle.importKey("jwk", key, { name:"RSASSA-PKCS1-v1_5", hash:"SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, bytes(parts[2]), new TextEncoder().encode(parts[0]+"."+parts[1]));
  if (!valid) throw new Error("Invalid signature.");
  if (claims.iss !== ISSUER || claims.aud !== AUDIENCE || claims.product_id !== PRODUCT_ID || claims.mode !== mode) throw new Error("This access link is not for this Hub.");
  if (!Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) || claims.iat > now + 30 || claims.exp <= now || claims.exp - claims.iat > 300 || claims.exp <= claims.iat || (claims.nbf !== undefined && claims.nbf > now)) throw new Error("Access link expired. Open the Hub again from your store library.");
  if (!claims.sub || typeof claims.sub !== "string" || !claims.jti || typeof claims.jti !== "string") throw new Error("Invalid buyer.");
  if (!normalizeEmail(email) || normalizeEmail(claims.email) !== normalizeEmail(email)) throw new Error("Sign in with the email used for your store purchase.");
  return claims;
}
