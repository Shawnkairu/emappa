import type { HomeownerStepProps } from "./HomeownerOnboarding";

export default function Step5({ form, setForm, goToStep }: HomeownerStepProps) {
  const canContinue = form.authorityDoc.trim().length > 2 && form.utilityEvidence.trim().length > 2 && form.siteConsent;

  return (
    <div className="onboard-pane">
      <label htmlFor="homeowner-authority-doc">
        Authority document prepared
        <input id="homeowner-authority-doc" value={form.authorityDoc} onChange={(event) => setForm({ ...form, authorityDoc: event.target.value })} placeholder="Title, lease, or owner authorization" />
      </label>
      <label htmlFor="homeowner-utility-evidence">
        Utility account evidence
        <input id="homeowner-utility-evidence" value={form.utilityEvidence} onChange={(event) => setForm({ ...form, utilityEvidence: event.target.value })} placeholder="Bill, account holder, or service reference" />
      </label>
      <label className="terms-check" htmlFor="homeowner-id-ready">
        <input id="homeowner-id-ready" type="checkbox" checked={form.nationalIdReady} onChange={(event) => setForm({ ...form, nationalIdReady: event.target.checked })} />
        <span>National ID or equivalent identity evidence is ready for review.</span>
      </label>
      <label className="terms-check" htmlFor="homeowner-site-consent">
        <input id="homeowner-site-consent" type="checkbox" checked={form.siteConsent} onChange={(event) => setForm({ ...form, siteConsent: event.target.checked })} />
        <span>I consent to site inspection if this property proceeds to deployment readiness.</span>
      </label>
      <div className="onboard-actions">
        <button className="ghost-action" onClick={() => goToStep(3)} type="button">Back</button>
        <button disabled={!canContinue} onClick={() => goToStep(5)} type="button">Continue</button>
      </div>
    </div>
  );
}
