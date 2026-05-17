import { useState, type FormEvent } from "react";
import { completeOnboarding } from "../../lib/api";

export function FinancierWebOnboarding({ onFinished }: { onFinished: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    investorKind: "individual" as "individual" | "institution",
    targetDealSize: "",
    targetReturn: "",
  });

  async function finishFinancier(event: FormEvent) {
    event.preventDefault();
    const deal = Number(form.targetDealSize);
    const ret = Number(form.targetReturn);
    if (!form.displayName.trim()) {
      setMessage("Enter investor name.");
      return;
    }
    if (!Number.isFinite(deal) || deal <= 0 || !Number.isFinite(ret) || ret <= 0) {
      setMessage("Enter target deal size and scenario return percentage.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await completeOnboarding({
        displayName: form.displayName.trim(),
        profile: {
          investor_kind: form.investorKind,
          target_deal_size_kes: deal,
          target_return_pct: ret,
        },
      });
      await onFinished();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not finish onboarding.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="onboard-shell">
      <section className="onboard-card">
        <div className="onboard-header">
          <div>
            <p className="eyebrow">Financier onboarding</p>
            <h1>Investor profile</h1>
          </div>
        </div>
        <form className="onboard-pane" onSubmit={finishFinancier}>
          <label htmlFor="fn-name">Investor name<input id="fn-name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required /></label>
          <label htmlFor="fn-kind">Kind</label>
          <select id="fn-kind" value={form.investorKind} onChange={(e) => setForm({ ...form, investorKind: e.target.value as "individual" | "institution" })}>
            <option value="individual">Individual</option>
            <option value="institution">Institution</option>
          </select>
          <label htmlFor="fn-deal">Target deal size (KES)<input id="fn-deal" inputMode="numeric" value={form.targetDealSize} onChange={(e) => setForm({ ...form, targetDealSize: e.target.value })} required /></label>
          <label htmlFor="fn-ret">Scenario return target (%)<input id="fn-ret" inputMode="numeric" value={form.targetReturn} onChange={(e) => setForm({ ...form, targetReturn: e.target.value })} required /></label>
          <p className="form-note">Scenario targets are planning inputs; outcomes vary by project and measured monetized energy.</p>
          <div className="onboard-actions">
            <button type="submit" disabled={busy}>{busy ? "Saving..." : "Finish onboarding"}</button>
          </div>
        </form>
        {message ? <p className="form-note onboard-message" role="status">{message}</p> : null}
      </section>
    </main>
  );
}

export default FinancierWebOnboarding;
