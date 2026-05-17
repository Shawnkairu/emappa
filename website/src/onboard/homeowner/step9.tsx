import type { HomeownerStepProps } from "./HomeownerOnboarding";

export default function Step9({ form, buildingId, goToStep }: HomeownerStepProps) {
  return (
    <div className="onboard-pane">
      <div className="homeowner-intro-grid">
        <article>
          <span>Verified</span>
          <strong>{buildingId ? "Property profile saved" : "Property profile pending"}</strong>
          <small>{form.name} · {form.propertyType.replace(/_/g, " ")}</small>
        </article>
        <article>
          <span>Load</span>
          <strong>KES {Math.round(form.monthlySpendKes).toLocaleString()} / month</strong>
          <small>{form.daytimeUsage} daytime · {form.eveningUsage} evening use</small>
        </article>
        <article>
          <span>Roof</span>
          <strong>{Math.round(form.roofArea).toLocaleString()} sqm</strong>
          <small>{form.connectivity.replace(/_/g, " ")} connectivity noted</small>
        </article>
      </div>
      <div className="terms-preview">
        <p>DRS is not inside onboarding. You can initiate only after reviewing this readiness summary.</p>
      </div>
      <div className="onboard-actions">
        <button className="ghost-action" onClick={() => goToStep(7)} type="button">Back</button>
        <button onClick={() => goToStep(9)} type="button">Review decision</button>
      </div>
    </div>
  );
}
