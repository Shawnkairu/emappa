import { useId, useState } from "react";
import type { ComponentPropsWithoutRef, FormEvent, ReactNode } from "react";

export type RequiresReasonSubmit = {
  event: FormEvent<HTMLFormElement>;
  formData: FormData;
  reason: string;
};

type RequiresReasonProps = Omit<ComponentPropsWithoutRef<"form">, "onSubmit"> & {
  children: ReactNode;
  disabled?: boolean;
  pending?: boolean;
  reasonHelp?: string;
  reasonLabel?: string;
  submitLabel?: string;
  onReasonedSubmit: (payload: RequiresReasonSubmit) => void | Promise<void>;
};

export function RequiresReason({
  children,
  className,
  disabled = false,
  pending = false,
  reasonHelp = "Required for the immutable audit log.",
  reasonLabel = "Reason",
  submitLabel = "Submit",
  onReasonedSubmit,
  ...formProps
}: RequiresReasonProps) {
  const reasonId = useId();
  const helpId = useId();
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();
  const cannotSubmit = disabled || pending || !trimmedReason;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedReason) return;

    const formData = new FormData(event.currentTarget);
    formData.set("reason", trimmedReason);
    await onReasonedSubmit({ event, formData, reason: trimmedReason });
  }

  return (
    <form {...formProps} className={["requires-reason", className].filter(Boolean).join(" ")} onSubmit={handleSubmit}>
      {children}
      <label className="requires-reason-field" htmlFor={reasonId}>
        <span>{reasonLabel}</span>
        <textarea
          aria-describedby={helpId}
          disabled={disabled || pending}
          id={reasonId}
          name="reason"
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain why this change is necessary."
          required
          rows={3}
          value={reason}
        />
      </label>
      <div className="requires-reason-footer">
        <p id={helpId}>{reasonHelp}</p>
        <button className="primary-action" disabled={cannotSubmit} type="submit">
          {pending ? "Submitting..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
