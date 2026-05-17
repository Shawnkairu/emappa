import type { ResidentLoadProfileDraft } from "./step3";

export function ResidentStep4CapacityCheck({
  loadProfile,
  unitCount,
  onBack,
  onContinue,
}: {
  loadProfile: ResidentLoadProfileDraft;
  unitCount: number;
  onBack: () => void;
  onContinue: () => void;
}) {
  const spend = Number(loadProfile.monthlySpendKes);
  const projectedKwh = Number.isFinite(spend) && spend > 0 ? Math.round(spend / 32) : 80;
  const queuePosition = Math.max(1, Math.min(24, Math.round(unitCount / 4) + loadProfile.applianceProfile.length));

  return (
    <div className="onboard-pane">
      <div className="pledge-preview">
        <span>Capacity projection</span>
        <strong>Queue position {queuePosition}</strong>
        <small>Final capacity clears after ATS mapping and project readiness checks.</small>
      </div>
      <div className="terms-preview">
        <p><strong>{projectedKwh} kWh/month</strong> estimated from your L1 load profile.</p>
        <p>Higher evening use and larger appliance profiles may move the unit behind already-cleared households.</p>
      </div>
      <div className="onboard-actions">
        <button className="ghost-action" type="button" onClick={onBack}>Back</button>
        <button type="button" onClick={onContinue}>Continue to pledge decision</button>
      </div>
    </div>
  );
}
