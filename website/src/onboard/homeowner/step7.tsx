import type { HomeownerStepProps } from "./HomeownerOnboarding";

export default function Step7({ form, setForm, goToStep }: HomeownerStepProps) {
  const canContinue = form.appliances.trim().length > 2 && form.criticalLoads.trim().length > 2;

  return (
    <div className="onboard-pane">
      <label htmlFor="homeowner-appliances">
        Major appliances
        <textarea id="homeowner-appliances" value={form.appliances} onChange={(event) => setForm({ ...form, appliances: event.target.value })} placeholder="Fridge, pump, TV, cooker, work tools" />
      </label>
      <label htmlFor="homeowner-daytime-use">
        Daytime usage
        <select id="homeowner-daytime-use" value={form.daytimeUsage} onChange={(event) => setForm({ ...form, daytimeUsage: event.target.value })}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <label htmlFor="homeowner-evening-use">
        Evening usage
        <select id="homeowner-evening-use" value={form.eveningUsage} onChange={(event) => setForm({ ...form, eveningUsage: event.target.value })}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <label htmlFor="homeowner-critical-loads">
        Critical loads
        <textarea id="homeowner-critical-loads" value={form.criticalLoads} onChange={(event) => setForm({ ...form, criticalLoads: event.target.value })} placeholder="Fridge, medical device, router, lights" />
      </label>
      <div className="onboard-actions">
        <button className="ghost-action" onClick={() => goToStep(5)} type="button">Back</button>
        <button disabled={!canContinue} onClick={() => goToStep(7)} type="button">Continue</button>
      </div>
    </div>
  );
}
