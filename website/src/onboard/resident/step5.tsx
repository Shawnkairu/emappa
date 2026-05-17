export function ResidentStep5PledgeDecision({
  amount,
  activated,
  busy,
  onAmountChange,
  onBack,
  onFinish,
}: {
  amount: string;
  activated: boolean;
  busy: boolean;
  onAmountChange: (amount: string) => void;
  onBack: () => void;
  onFinish: (skipPledge: boolean) => void;
}) {
  return (
    <div className="onboard-pane">
      <div className="pledge-preview">
        <span>{activated ? "Live apartment" : "Pre-activation"}</span>
        <strong>{activated ? "Buy tokens after this step" : "Non-binding pledge"}</strong>
        <small>
          {activated
            ? "Token purchase is a real-money post-activation flow."
            : "Pilot pledges reserve interest and do not charge money."}
        </small>
      </div>
      <label htmlFor="pledge-kes">
        Amount (KES)
        <input
          id="pledge-kes"
          inputMode="numeric"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder="1000"
        />
      </label>
      <div className="onboard-actions">
        <button className="ghost-action" type="button" onClick={onBack}>Back</button>
        <button type="button" disabled={busy} onClick={() => onFinish(false)}>
          {busy ? "Saving..." : activated ? "Finish and open wallet" : "Pledge and finish"}
        </button>
        <button type="button" disabled={busy} onClick={() => onFinish(true)}>Skip for now</button>
      </div>
    </div>
  );
}
