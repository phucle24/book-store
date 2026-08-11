export const ADMIN_COOKIE_NAME = "tdmc_admin_session";

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getSecret() {
  return (
    process.env.SESSION_SECRET ||
    `${process.env.ADMIN_EMAIL || "admin@example.com"}:${process.env.ADMIN_PASSWORD || "change_me"}`
  );
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

export async function createAdminSessionToken() {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const payload = `admin:${expiresAt}`;
  const signature = await sign(payload);
  return `${expiresAt}.${signature}`;
}

export async function verifyAdminSessionToken(token?: string | null) {
  if (!token) return false;

  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!expiresAt || !signature || expiresAt < Date.now()) return false;

  const expectedSignature = await sign(`admin:${expiresAt}`);
  if (expectedSignature.length !== signature.length) return false;

  let diff = 0;
  for (let index = 0; index < expectedSignature.length; index += 1) {
    diff |= expectedSignature.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return diff === 0;
}
