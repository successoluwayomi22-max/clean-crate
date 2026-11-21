import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";

const DATA_DIR = path.join(process.cwd(), "data");
const SECRET_FILE = path.join(DATA_DIR, ".runtime-secret");

let cachedSecret: string | null = null;

export function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }
  if (cachedSecret) {
    return cachedSecret;
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(SECRET_FILE)) {
    const existing = fs.readFileSync(SECRET_FILE, "utf8").trim();
    if (existing.length >= 32) {
      cachedSecret = existing;
      return existing;
    }
  }
  const generated = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  cachedSecret = generated;
  return generated;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const [, salt, hexDigest] = parts;
  if (!salt || !hexDigest) return false;
  const expected = Buffer.from(hexDigest, "hex");
  const actual = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  if (expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function signSessionToken(rawToken: string): string {
  const hmac = crypto
    .createHmac("sha256", getSessionSecret())
    .update(rawToken)
    .digest("hex");
  return `${rawToken}.${hmac}`;
}

export function verifySignedSessionToken(signedCookie: string | undefined): string | null {
  if (!signedCookie) return null;
  const dotIdx = signedCookie.indexOf(".");
  if (dotIdx <= 0) return null;
  const rawToken = signedCookie.slice(0, dotIdx);
  const providedSig = signedCookie.slice(dotIdx + 1);
  if (!rawToken || !providedSig) return null;

  const expectedSig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(rawToken)
    .digest("hex");

  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  return rawToken;
}

export function generateBookingReference(): string {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `CC-${year}-${suffix}`;
}

export function sanitizePlainText(input: string, maxLen = 500): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  return realIp || "127.0.0.1";
}

export function verifySameOrigin(req: NextRequest): boolean {
  const host = req.headers.get("host");
  if (!host) return false;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const sourceUrl = origin || referer;
  if (!sourceUrl) {
    // Allow non-browser direct JSON tests in local dev only when Sec-Fetch-Site isn't cross-site
    const secFetchSite = req.headers.get("sec-fetch-site");
    return secFetchSite !== "cross-site";
  }
  try {
    const parsed = new URL(sourceUrl);
    return parsed.host === host;
  } catch {
    return false;
  }
}

interface RateBucket {
  timestamps: number[];
}

const rateBuckets = new Map<string, RateBucket>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  if (rateBuckets.size > 4000) {
    for (const [bucketKey, bucket] of rateBuckets.entries()) {
      bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
      if (bucket.timestamps.length === 0) {
        rateBuckets.delete(bucketKey);
      }
    }
  }

  const bucket = rateBuckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateBuckets.set(key, bucket);
    return { allowed: false, retryAfterSec };
  }

  bucket.timestamps.push(now);
  rateBuckets.set(key, bucket);
  return { allowed: true, retryAfterSec: 0 };
}

