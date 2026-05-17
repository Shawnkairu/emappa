import type { HomeownerStepProps } from "./HomeownerOnboarding";

export default function Step3({ goToStep }: HomeownerStepProps) {
  return (
    <div className="onboard-pane">
      <div className="pledge-preview">
        <span>Homeowner</span>
        <strong>I own or control a home/property</strong>
        <small>This keeps the flow separate from apartment building owners and residents.</small>
      </div>
      <div className="onboard-actions">
        <button className="ghost-action" onClick={() => goToStep(1)} type="button">Back</button>
        <button onClick={() => goToStep(3)} type="button">Confirm role</button>
      </div>
    </div>
  );
}
