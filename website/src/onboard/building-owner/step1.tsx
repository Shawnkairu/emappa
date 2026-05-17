import type { BuildingOwnerStepProps } from "./BuildingOwnerWebOnboarding";

export default function Step1({ goToStep }: BuildingOwnerStepProps) {
  return (
    <div className="onboard-pane">
      <p>Turn a multi-unit building roof into a local energy platform for residents.</p>
      <div className="homeowner-intro-grid">
        <article><span>1</span><strong>List the building</strong><small>Capture location, units, and occupancy.</small></article>
        <article><span>2</span><strong>Verify authority</strong><small>Collect review notes before DRS begins.</small></article>
        <article><span>3</span><strong>Preview roof capacity</strong><small>Final sizing still belongs in DRS.</small></article>
      </div>
      <div className="onboard-actions">
        <button type="button" onClick={() => goToStep(1)}>Get started</button>
      </div>
    </div>
  );
}
