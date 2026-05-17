import type { BuildingOwnerStepProps } from "./BuildingOwnerWebOnboarding";

export default function Step5({ form, setForm, goToStep }: BuildingOwnerStepProps) {
  const canContinue = form.authorityDoc.trim().length > 2 && form.utilityDoc.trim().length > 2 && form.reviewerContact.trim().length > 2;

  return (
    <div className="onboard-pane">
      <label htmlFor="bo-authority">Ownership or authority document<input id="bo-authority" value={form.authorityDoc} onChange={(e) => setForm({ ...form, authorityDoc: e.target.value })} placeholder="Title deed, lease, or management agreement" /></label>
      <label htmlFor="bo-utility">Tax or utility document<input id="bo-utility" value={form.utilityDoc} onChange={(e) => setForm({ ...form, utilityDoc: e.target.value })} placeholder="Tax, utility, or service record" /></label>
      <label htmlFor="bo-reviewer-contact">Manual review contact<input id="bo-reviewer-contact" value={form.reviewerContact} onChange={(e) => setForm({ ...form, reviewerContact: e.target.value })} placeholder="Name and phone or email" /></label>
      <label className="terms-check" htmlFor="bo-company-docs">
        <input id="bo-company-docs" type="checkbox" checked={form.companyDocsReady} onChange={(e) => setForm({ ...form, companyDocsReady: e.target.checked })} />
        <span>Company or national ID documents are ready for review.</span>
      </label>
      <div className="onboard-actions">
        <button type="button" className="ghost-action" onClick={() => goToStep(3)}>Back</button>
        <button type="button" disabled={!canContinue} onClick={() => goToStep(5)}>Continue</button>
      </div>
    </div>
  );
}
