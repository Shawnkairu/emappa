import type { BuildingOwnerStepProps } from "./BuildingOwnerWebOnboarding";

export default function Step8({ form, busy, setForm, goToStep, finish }: BuildingOwnerStepProps) {
  return (
    <div className="onboard-pane">
      <div className="terms-preview">
        <p>Host royalty and ownership are separate. Royalties come from monetized solar only, and deployment waits for DRS readiness gates.</p>
        <label className="terms-check" htmlFor="bo-terms">
          <input id="bo-terms" type="checkbox" checked={form.acceptedTerms} onChange={(e) => setForm({ ...form, acceptedTerms: e.target.checked })} />
          <span>I understand pilot terms are non-binding and settlement remains simulated until live.</span>
        </label>
      </div>
      <div className="onboard-actions">
        <button type="button" className="ghost-action" onClick={() => goToStep(6)}>Back</button>
        <button type="button" disabled={!form.acceptedTerms || busy} onClick={finish}>{busy ? "Finishing..." : "Finish onboarding"}</button>
      </div>
    </div>
  );
}
