type AuditResult = "success" | "failure";

export type AuditActor = {
  userId?: string;
  username?: string;
  email?: string;
  displayName?: string;
  departmentName?: string;
};

export type AuditLogInput = {
  req?: Request;
  orgId?: string;
  actor?: AuditActor;
  action: string;
  permission?: string;
  resource?: string;
  target?: Record<string, unknown>;
  result: AuditResult;
  statusCode?: number;
  errorMessage?: string;
};

const SERVICE_NAME = "audit";

function getRequestId(req?: Request) {
  if (!req) {
    return undefined;
  }
  return (
    req.headers.get("x-request-id") ??
    req.headers.get("x-vercel-id") ??
    req.headers.get("x-amzn-trace-id") ??
    undefined
  );
}

function getClientIp(req?: Request) {
  if (!req) {
    return undefined;
  }
  const forwarded = req.headers.get("x-forwarded-for");
  if (!forwarded) {
    return undefined;
  }
  return forwarded.split(",")[0]?.trim();
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const now = new Date().toISOString();
    const auditId = `${now}#${crypto.randomUUID()}`;
    const orgId = input.orgId ?? "unknown";
    const req = input.req;
    const method = req?.method;
    const path = req ? new URL(req.url).pathname : undefined;

    const item = {
      orgId,
      auditId,
      timestamp: now,
      action: input.action,
      permission: input.permission ?? input.action,
      resource: input.resource ?? input.action.split(".")[0],
      target: input.target,
      result: input.result,
      statusCode: input.statusCode,
      errorMessage: input.errorMessage,
      actor: input.actor,
      request: {
        method,
        path,
        requestId: getRequestId(req),
      },
      ip: getClientIp(req),
      userAgent: req?.headers.get("user-agent") ?? undefined,
    };
    const payload = {
      service: SERVICE_NAME,
      ...item,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    };
    console.log(JSON.stringify(payload));
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
