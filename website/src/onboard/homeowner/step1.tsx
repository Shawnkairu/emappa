import type { HomeownerStepProps } from "./HomeownerOnboarding";

export default function Step1({ goToStep }: HomeownerStepProps) {
  return (
    <div className="onboard-pane">
      <div className="homeowner-intro-grid">
        <article>
          <span>1</span>
          <strong>Turn your home into an energy node</strong>
          <small>Set up one property profile for your roof, load, and deployment readiness.</small>
        </article>
        <article>
          <span>2</span>
          <strong>Verify before DRS</strong>
          <small>Authority, utility, load, and site facts are collected before project initiation.</small>
        </article>
        <article>
          <span>3</span>
          <strong>No payment setup here</strong>
          <small>Financial rails are deferred until a real point of need.</small>
        </article>
      </div>
      <button onClick={() => goToStep(1)} type="button">Get started</button>
    </div>
  );
}
