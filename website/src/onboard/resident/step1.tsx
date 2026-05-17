import type { FormEvent } from "react";

export type ResidentFindBuildingDraft = {
  code: string;
  unitNumber: string;
  manualAddress: string;
};

export function ResidentStep1FindBuilding({
  draft,
  busy,
  onChange,
  onSubmit,
}: {
  draft: ResidentFindBuildingDraft;
  busy: boolean;
  onChange: (draft: ResidentFindBuildingDraft) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form className="onboard-pane" onSubmit={onSubmit}>
      <label htmlFor="resident-code">
        Building invite code
        <input
          id="resident-code"
          value={draft.code}
          onChange={(event) => onChange({ ...draft, code: event.target.value })}
          placeholder="From owner or QR"
          autoComplete="off"
        />
      </label>
      <label htmlFor="resident-unit">
        Unit number
        <input
          id="resident-unit"
          value={draft.unitNumber}
          onChange={(event) => onChange({ ...draft, unitNumber: event.target.value })}
          placeholder="Apt 4B"
          autoComplete="off"
          required
        />
      </label>
      <label htmlFor="resident-address">
        Manual address fallback
        <input
          id="resident-address"
          value={draft.manualAddress}
          onChange={(event) => onChange({ ...draft, manualAddress: event.target.value })}
          placeholder="Building name or street if code is unavailable"
          autoComplete="street-address"
        />
      </label>
      <div className="onboard-actions">
        <button type="submit" disabled={busy}>{busy ? "Checking..." : "Find building"}</button>
      </div>
    </form>
  );
}
