import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireAuthContext } from "@/lib/auth/requireAuthContext";
import { deleteClient, listClients, upsertClient } from "@/features/client-master/api/server";
import type { NewClientInput, UpdateClientInput } from "@/features/client-master/types";

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isOptionalString = (v: unknown): v is string | undefined => v === undefined || typeof v === "string";

function isNewClientInput(v: unknown): v is NewClientInput {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;

  return (
    isNonEmptyString(r.name) &&
    isOptionalString(r.note) &&
    isNonEmptyString(r.category) &&
    isOptionalString(r.region) &&
    isNonEmptyString(r.currency) &&
    (r.status === "active" || r.status === "inactive") &&
    isOptionalString(r.address) &&
    isOptionalString(r.phone) &&
    isOptionalString(r.taxId)
  );
}

function isUpdateClientInput(v: unknown): v is UpdateClientInput {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;

  return (
    isNonEmptyString(r.clientId) &&
    isNonEmptyString(r.name) &&
    isOptionalString(r.note) &&
    isNonEmptyString(r.category) &&
    isOptionalString(r.region) &&
    isNonEmptyString(r.currency) &&
    (r.status === "active" || r.status === "inactive") &&
    isOptionalString(r.address) &&
    isOptionalString(r.phone) &&
    isOptionalString(r.taxId)
  );
}

const resource = "clients";

const toClientTarget = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return {
    clientId: typeof record.clientId === "string" ? record.clientId : undefined,
    name: typeof record.name === "string" ? record.name : undefined,
    category: typeof record.category === "string" ? record.category : undefined,
  };
};

export async function GET(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "clients.list";
  if (!auth.ok) {
    await writeAuditLog({
      req,
      actor: auth.actor,
      action,
      resource,
      result: "failure",
      statusCode: auth.status,
      errorMessage: auth.error,
    });
    return auth.response;
  }
  const { orgId, actor } = auth;
  try {
    const items = await listClients(orgId);
    await writeAuditLog({ req, orgId, actor, action, resource, result: "success", statusCode: 200 });
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list clients";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to list clients" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "clients.create";
  if (!auth.ok) {
    await writeAuditLog({
      req,
      actor: auth.actor,
      action,
      resource,
      result: "failure",
      statusCode: auth.status,
      errorMessage: auth.error,
    });
    return auth.response;
  }
  const { orgId, actor } = auth;
  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: undefined,
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isNewClientInput(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toClientTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const saved = await upsertClient(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { clientId: saved.clientId, name: saved.name },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create client";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toClientTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "clients.update";
  if (!auth.ok) {
    await writeAuditLog({
      req,
      actor: auth.actor,
      action,
      resource,
      result: "failure",
      statusCode: auth.status,
      errorMessage: auth.error,
    });
    return auth.response;
  }
  const { orgId, actor } = auth;
  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: undefined,
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isUpdateClientInput(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toClientTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const saved = await upsertClient(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { clientId: saved.clientId, name: saved.name },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update client";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toClientTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

function isDeleteClientBody(v: unknown): v is { clientId: string } {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return typeof r.clientId === "string" && r.clientId.trim().length > 0;
}

export async function DELETE(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "clients.delete";
  if (!auth.ok) {
    await writeAuditLog({
      req,
      actor: auth.actor,
      action,
      resource,
      result: "failure",
      statusCode: auth.status,
      errorMessage: auth.error,
    });
    return auth.response;
  }
  const { orgId, actor } = auth;
  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isDeleteClientBody(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    await deleteClient(orgId, bodyUnknown.clientId);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { clientId: bodyUnknown.clientId },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete client";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { clientId: (bodyUnknown as { clientId?: string }).clientId },
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
