import { NextResponse } from "next/server";
import { verifyCognitoIdToken } from "@/lib/auth/verifyCognitoIdToken";
import type { AuditActor } from "@/lib/audit";

export type AuthContext = {
  ok: true;
  orgId: string;
  actor: AuditActor;
};

export type AuthFailure = {
  ok: false;
  response: NextResponse;
  error: string;
  status: number;
  actor?: AuditActor;
};

export type AuthResult = AuthContext | AuthFailure;

function getBearer(req: Request) {
  const v = req.headers.get("authorization") ?? "";
  const m = v.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

function buildActor(payload: Record<string, unknown>): AuditActor {
  return {
    userId: typeof payload.sub === "string" ? payload.sub : undefined,
    username: typeof payload["cognito:username"] === "string" ? String(payload["cognito:username"]) : undefined,
    email: typeof payload.email === "string" ? payload.email : undefined,
    displayName: typeof payload["custom:displayName"] === "string" ? String(payload["custom:displayName"]) : undefined,
    departmentName:
      typeof payload["custom:departmentName"] === "string" ? String(payload["custom:departmentName"]) : undefined,
  };
}

export async function requireAuthContext(req: Request): Promise<AuthResult> {
  const token = getBearer(req);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Missing token" }, { status: 401 }),
      error: "Missing token",
      status: 401,
    };
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await verifyCognitoIdToken(token)) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
      error: "Invalid token",
      status: 401,
    };
  }

  const orgId = String(payload["custom:orgId"] ?? "");
  const actor = buildActor(payload);
  if (!orgId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Missing orgId claim" }, { status: 403 }),
      error: "Missing orgId claim",
      status: 403,
      actor,
    };
  }

  return { ok: true, orgId, actor };
}
