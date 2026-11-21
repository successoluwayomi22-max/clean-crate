import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { sha256Hex, signSessionToken, verifySignedSessionToken } from "@/lib/security";

export const ADMIN_COOKIE_NAME = "cc_admin_session";
const SESSION_TTL_HOURS = 12;

export interface AdminIdentity {
  id: number;
  email: string;
  name: string;
  role: string;
}

export function createAdminSession(adminId: number, ipHint: string): { cookieValue: string; expiresAtIso: string } {
  const db = getDb();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();

  db.prepare(
    "DELETE FROM admin_sessions WHERE expires_at <= datetime('now') OR admin_id = ?"
  ).run(adminId);

  db.prepare(
    "INSERT INTO admin_sessions (admin_id, token_hash, expires_at, ip_hint) VALUES (?, ?, ?, ?)"
  ).run(adminId, tokenHash, expiresAt, ipHint.slice(0, 64));

  return {
    cookieValue: signSessionToken(rawToken),
    expiresAtIso: expiresAt,
  };
}

export async function getAuthenticatedAdmin(): Promise<AdminIdentity | null> {
  const cookieStore = await cookies();
  const signedCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const rawToken = verifySignedSessionToken(signedCookie);
  if (!rawToken) return null;

  const tokenHash = sha256Hex(rawToken);
  const db = getDb();

  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, s.expires_at
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s.admin_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as (AdminIdentity & { expires_at: string }) | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(tokenHash);
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
  };
}

export async function revokeCurrentAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const signedCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const rawToken = verifySignedSessionToken(signedCookie);
  if (rawToken) {
    const db = getDb();
    db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(sha256Hex(rawToken));
  }
}

export function recordAudit(
  actor: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {}
): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO audit_logs (actor, action, target_type, target_id, metadata_json) VALUES (?, ?, ?, ?, ?)"
  ).run(actor, action, targetType, targetId, JSON.stringify(metadata));
}

