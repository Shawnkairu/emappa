import { useState, type FormEvent } from "react";
import type { BusinessType } from "@emappa/shared";
import { completeOnboarding } from "../../lib/api";

export function ProviderWebOnboarding({ onFinished }: { onFinished: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    contact: "",
    businessType: "panels" as BusinessType,
  });

  async function finishProvider(event: FormEvent) {
    event.preventDefault();
    if (!form.businessName.trim() || !form.contact.trim()) {
      setMessage("Enter business name and operations contact.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await completeOnboarding({
        displayName: form.businessName.trim(),
        businessType: form.businessType,
        profile: {
          business_name: form.businessName.trim(),
          operations_contact: form.contact.trim(),
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
            <p className="eyebrow">Provider onboarding</p>
            <h1>Business basics</h1>
          </div>
        </div>
        <form className="onboard-pane" onSubmit={finishProvider}>
          <label htmlFor="pv-name">Business name<input id="pv-name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required /></label>
          <label htmlFor="pv-contact">Operations contact<input id="pv-contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} required /></label>
          <label htmlFor="pv-type">Business type</label>
          <select id="pv-type" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value as BusinessType })}>
            <option value="panels">Panels</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="both">Both</option>
          </select>
          <div className="onboard-actions">
            <button type="submit" disabled={busy}>{busy ? "Saving..." : "Finish onboarding"}</button>
          </div>
        </form>
        {message ? <p className="form-note onboard-message" role="status">{message}</p> : null}
      </section>
    </main>
  );
}

export default ProviderWebOnboarding;
