import type { BuildingOwnerStepProps } from "./BuildingOwnerWebOnboarding";

export default function Step3({ goToStep }: BuildingOwnerStepProps) {
  return (
    <div className="onboard-pane">
      <div className="pledge-preview">
        <span>Building Owner</span>
        <strong>I own or manage an apartment building</strong>
        <small>Admin access is never part of this public role flow.</small>
      </div>
      <div className="onboard-actions">
        <button className="ghost-action" type="button" onClick={() => goToStep(1)}>Back</button>
        <button type="button" onClick={() => goToStep(3)}>Confirm role</button>
      </div>
    </div>
  );
}
