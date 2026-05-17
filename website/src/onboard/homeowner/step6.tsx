import type { HomeownerStepProps } from "./HomeownerOnboarding";

export default function Step6({ form, setForm, goToStep }: HomeownerStepProps) {
  const canContinue = form.meterNumber.trim().length > 2 && Number.isFinite(form.monthlySpendKes) && form.monthlySpendKes > 0;

  return (
    <div className="onboard-pane">
      <label htmlFor="homeowner-meter-type">
        KPLC meter type
        <select id="homeowner-meter-type" value={form.meterType} onChange={(event) => setForm({ ...form, meterType: event.target.value })}>
          <option value="prepaid">Prepaid</option>
          <option value="postpaid">Postpaid</option>
          <option value="unknown">Not sure</option>
        </select>
      </label>
      <label htmlFor="homeowner-meter-number">
        Meter number
        <input id="homeowner-meter-number" value={form.meterNumber} onChange={(event) => setForm({ ...form, meterNumber: event.target.value })} placeholder="KPLC meter number" />
      </label>
      <label htmlFor="homeowner-monthly-spend">
        Monthly spend, KES
        <input id="homeowner-monthly-spend" type="number" min={1} value={form.monthlySpendKes} onChange={(event) => setForm({ ...form, monthlySpendKes: Number(event.target.value) })} />
      </label>
      <label htmlFor="homeowner-usage-pattern">
        Prepaid usage pattern
        <textarea id="homeowner-usage-pattern" value={form.usagePattern} onChange={(event) => setForm({ ...form, usagePattern: event.target.value })} />
      </label>
      <div className="onboard-actions">
        <button className="ghost-action" onClick={() => goToStep(4)} type="button">Back</button>
        <button disabled={!canContinue} onClick={() => goToStep(6)} type="button">Continue</button>
      </div>
    </div>
  );
}
