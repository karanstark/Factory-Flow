// Password hashing (scrypt) and HMAC-signed session tokens.
// Pure Node crypto — no external auth dependency — so it runs server-side in
// Server Actions / Route Handlers / seed scripts. Supabase Auth is the
// documented production swap; the session contract stays the same.
import crypto from "node:crypto";
import { Role } from "./constants";

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALTLEN = 16;

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set SESSION_SECRET in .env (>= 16 chars).",
    );
  }
  return s;
}

/** Hash a password with a random salt using scrypt. */
export async function hashPassword(
  password: string,
): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(SCRYPT_SALTLEN).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return { hash, salt };
}

/** Verify a password against stored salt+hash (constant-time compare). */
export function verifyPassword(
  password: string,
  salt: string,
  hash: string,
): boolean {
  try {
    const computed = crypto
      .scryptSync(password, salt, SCRYPT_KEYLEN)
      .toString("hex");
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// --- Session tokens (stateless, HMAC-signed) ---
export interface SessionPayload {
  u: string; // user id
  r: Role; // role at issue time (re-validated against DB on use)
  e: number; // expiry epoch ms
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function b64url(buf: Buffer | string): string {
  return (Buffer.isBuffer(buf) ? buf : Buffer.from(buf, "utf8")).toString(
    "base64url",
  );
}

function sign(payloadB64: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("base64url");
}

export function createSessionToken(userId: string, role: Role): string {
  const payload: SessionPayload = {
    u: userId,
    r: role,
    e: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifySessionToken(
  token: string | undefined | null,
): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (
      !payload ||
      typeof payload.e !== "number" ||
      typeof payload.u !== "string" ||
      typeof payload.r !== "string"
    ) {
      return null;
    }
    if (payload.e < Date.now()) return null; // expired
    return payload;
  } catch {
    return null;
  }
}
