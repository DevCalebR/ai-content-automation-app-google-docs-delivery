import { cn } from "@/lib/utils";

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export function FormStateMessage({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className={cn(
        "text-sm",
        state.status === "success" ? "text-[var(--success)]" : "text-[var(--danger)]",
      )}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}

export function FieldErrorMessage({
  id,
  message,
}: {
  id: string;
  message?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className="text-sm text-[var(--danger)]"
      id={id}
      role="alert"
    >
      {message}
    </p>
  );
}
