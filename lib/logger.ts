type AuditPayload = {
  action: string;
  userId?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
};

const SENSITIVE_KEY_PATTERN = /(password|token|secret|authorization|cookie|hash|email)/i;

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : sanitize(nestedValue),
      ]),
    );
  }

  return value;
}

export function logAuditEvent(payload: AuditPayload) {
  const sanitizedPayload = sanitize(payload);
  console.info("[audit]", {
    timestamp: new Date().toISOString(),
    ...(sanitizedPayload && typeof sanitizedPayload === "object" ? sanitizedPayload : {}),
  });
}

export function logError(error: unknown, context: string) {
  console.error("[error]", {
    timestamp: new Date().toISOString(),
    context,
    error: sanitize(error),
  });
}
