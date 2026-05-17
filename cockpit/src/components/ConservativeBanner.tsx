import { useEffect, useState } from "react";
import {
  CONSERVATIVE_HEADER,
  CONSERVATIVE_HEADER_EVENT,
  CONSERVATIVE_HEADER_STATE_KEY,
  type ConservativeHeaderState,
} from "../api";

type ConservativeBannerProps = {
  message?: string;
  title?: string;
};

export function ConservativeBanner({
  message = "Mutation actions should stay paused until the disputed or missing data is resolved.",
  title = "Conservative mode active",
}: ConservativeBannerProps) {
  const [state, setState] = useState<ConservativeHeaderState | null>(() => readConservativeState());

  useEffect(() => {
    function handleHeader(event: Event) {
      setState((event as CustomEvent<ConservativeHeaderState>).detail);
    }

    globalThis.addEventListener?.(CONSERVATIVE_HEADER_EVENT, handleHeader);
    return () => globalThis.removeEventListener?.(CONSERVATIVE_HEADER_EVENT, handleHeader);
  }, []);

  if (!state?.active) return null;

  return (
    <aside className="conservative-banner" role="status" aria-live="polite">
      <div>
        <span>{CONSERVATIVE_HEADER}: {state.value}</span>
        <strong>{title}</strong>
      </div>
      <p>{message}</p>
    </aside>
  );
}

function readConservativeState(): ConservativeHeaderState | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(CONSERVATIVE_HEADER_STATE_KEY);
    return raw ? (JSON.parse(raw) as ConservativeHeaderState) : null;
  } catch {
    return null;
  }
}
