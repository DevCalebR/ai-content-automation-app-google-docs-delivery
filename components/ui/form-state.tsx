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
      className={cn(
        "text-sm",
        state.status === "success" ? "text-[var(--success)]" : "text-[var(--danger)]",
      )}
    >
      {state.message}
    </p>
  );
}
