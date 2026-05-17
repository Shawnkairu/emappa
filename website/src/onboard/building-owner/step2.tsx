import type { BuildingOwnerStepProps } from "./BuildingOwnerWebOnboarding";

export default function Step2({ goToStep }: BuildingOwnerStepProps) {
  return (
    <div className="onboard-pane">
      <div className="terms-preview">
        <p>Email and OTP are verified. The next screens collect building facts only.</p>
      </div>
      <div className="onboard-actions">
        <button className="ghost-action" type="button" onClick={() => goToStep(0)}>Back</button>
        <button type="button" onClick={() => goToStep(2)}>Continue</button>
      </div>
    </div>
  );
}
