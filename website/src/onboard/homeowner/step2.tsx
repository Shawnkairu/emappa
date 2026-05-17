import type { HomeownerStepProps } from "./HomeownerOnboarding";

export default function Step2({ form, setForm, goToStep }: HomeownerStepProps) {
  return (
    <div className="onboard-pane">
      <div className="terms-preview">
        <p>Your email and OTP are already verified for this web session.</p>
      </div>
      <label htmlFor="homeowner-display-name">
        Display name
        <input
          id="homeowner-display-name"
          value={form.displayName}
          autoComplete="name"
          onChange={(event) => setForm({ ...form, displayName: event.target.value })}
          placeholder="Amina"
        />
      </label>
      <div className="onboard-actions">
        <button className="ghost-action" onClick={() => goToStep(0)} type="button">Back</button>
        <button onClick={() => goToStep(2)} type="button">Continue</button>
      </div>
    </div>
  );
}
