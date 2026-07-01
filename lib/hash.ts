import crypto from "node:crypto";

export function hashIp(ip?: string | null) {
  if (!ip) return null;
  const salt = process.env.ADMIN_PASSWORD || "book-affiliate";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
