import type { HomeownerStepProps } from "./HomeownerOnboarding";

export default function Step10({ form, busy, setForm, goToStep, finish }: HomeownerStepProps) {
  return (
    <div className="onboard-pane">
      <div className="pledge-preview">
        <span>Decision</span>
        <strong>Ready to initiate a project?</strong>
        <small>Yes starts the DRS path after onboarding; no keeps the property enrolled but inactive.</small>
      </div>
      <label className="terms-check" htmlFor="homeowner-initiate">
        <input id="homeowner-initiate" type="checkbox" checked={form.initiateProject} onChange={(event) => setForm({ ...form, initiateProject: event.target.checked })} />
        <span>Initiate deployment readiness after this onboarding is complete.</span>
      </label>
      <div className="onboard-actions">
        <button className="ghost-action" onClick={() => goToStep(8)} type="button">Back</button>
        <button onClick={() => finish(false)} disabled={busy} type="button">{busy ? "Opening..." : "Keep inactive and open Home"}</button>
        <button onClick={() => finish(true)} disabled={busy || !form.initiateProject} type="button">{busy ? "Opening..." : "Initiate and open Home"}</button>
      </div>
    </div>
  );
}
