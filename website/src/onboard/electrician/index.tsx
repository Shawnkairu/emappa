import { useState, type FormEvent } from "react";
import { apiPostJson, completeOnboarding, readSession } from "../../lib/api";

type ElectricianScope = "install" | "inspection" | "maintenance";

export function ElectricianWebOnboarding({ onFinished }: { onFinished: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    region: "",
    scope: [] as ElectricianScope[],
    certName: "",
    certIssuer: "",
    certExpires: "",
    addCert: false,
  });

  async function finishElectrician(event: FormEvent) {
    event.preventDefault();
    const { displayName, region, scope } = form;
    if (!displayName.trim() || !region.trim() || scope.length === 0) {
      setMessage("Enter name, region, and at least one scope.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const userId = readSession()?.user?.id;
      if (form.addCert && userId && form.certName.trim() && form.certIssuer.trim() && form.certExpires.trim()) {
        const expiresAt = new Date(form.certExpires.trim());
        if (Number.isNaN(expiresAt.getTime())) {
          setMessage("Enter certification expiry as a valid date (e.g. 2027-12-31).");
          setBusy(false);
          return;
        }
        await apiPostJson(`/electricians/${encodeURIComponent(userId)}/certifications`, {
          name: form.certName.trim(),
          issuer: form.certIssuer.trim(),
          issuedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
        });
      }
      await completeOnboarding({
        displayName: displayName.trim(),
        profile: { region: region.trim(), scope },
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
            <p className="eyebrow">Electrician onboarding</p>
            <h1>Profile & certification</h1>
          </div>
        </div>
        <form className="onboard-pane" onSubmit={finishElectrician}>
          <label htmlFor="el-name">Name<input id="el-name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required /></label>
          <label htmlFor="el-region">Region<input id="el-region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} required /></label>
          <fieldset>
            <legend>Scope</legend>
            {(["install", "inspection", "maintenance"] as const).map((s) => (
              <label key={s} className="terms-check">
                <input
                  type="checkbox"
                  checked={form.scope.includes(s)}
                  onChange={() =>
                    setForm({
                      ...form,
                      scope: form.scope.includes(s) ? form.scope.filter((x) => x !== s) : [...form.scope, s],
                    })
                  }
                />
                <span>{s}</span>
              </label>
            ))}
          </fieldset>
          <label className="terms-check">
            <input type="checkbox" checked={form.addCert} onChange={(e) => setForm({ ...form, addCert: e.target.checked })} />
            <span>Add a certification record now</span>
          </label>
          {form.addCert ? (
            <>
              <label htmlFor="el-cert-name">Certification name<input id="el-cert-name" value={form.certName} onChange={(e) => setForm({ ...form, certName: e.target.value })} /></label>
              <label htmlFor="el-cert-issuer">Issuer<input id="el-cert-issuer" value={form.certIssuer} onChange={(e) => setForm({ ...form, certIssuer: e.target.value })} /></label>
              <label htmlFor="el-cert-exp">Expires at<input id="el-cert-exp" value={form.certExpires} onChange={(e) => setForm({ ...form, certExpires: e.target.value })} placeholder="2027-12-31" /></label>
            </>
          ) : null}
          <div className="onboard-actions">
            <button type="submit" disabled={busy}>{busy ? "Saving..." : "Finish onboarding"}</button>
          </div>
        </form>
        {message ? <p className="form-note onboard-message" role="status">{message}</p> : null}
      </section>
    </main>
  );
}

export default ElectricianWebOnboarding;
