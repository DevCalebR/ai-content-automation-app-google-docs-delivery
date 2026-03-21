type AuditPayload = {
  action: string;
  userId?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
};

export function logAuditEvent(payload: AuditPayload) {
  console.info("[audit]", {
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

export function logError(error: unknown, context: string) {
  console.error("[error]", {
    timestamp: new Date().toISOString(),
    context,
    error,
  });
}
