import type { BuildingOwnerStepProps } from "./BuildingOwnerWebOnboarding";

export default function Step7({ form, busy, setForm, goToStep, saveRoof }: BuildingOwnerStepProps) {
  return (
    <form className="onboard-pane" onSubmit={saveRoof}>
      <div className="terms-preview">
        <p>Use Microsoft footprint suggestion, redraw the polygon, or type square meters as fallback. This is a soft preview; DRS handles final sizing.</p>
      </div>
      <label htmlFor="bo-roof-mode">
        Capture mode
        <select id="bo-roof-mode" value={form.roofCaptureMode} onChange={(e) => setForm({ ...form, roofCaptureMode: e.target.value as typeof form.roofCaptureMode })}>
          <option value="auto_suggest">Looks right from footprint</option>
          <option value="owner_traced">Let me redraw</option>
          <option value="typed_sqm">Type sqm</option>
        </select>
      </label>
      <label htmlFor="bo-roof">Usable roof area (sqm)<input id="bo-roof" type="number" min={10} value={form.roofArea} onChange={(e) => setForm({ ...form, roofArea: Number(e.target.value) })} /></label>
      <div className="onboard-actions">
        <button type="button" className="ghost-action" onClick={() => goToStep(5)}>Back</button>
        <button type="submit" disabled={busy}>{busy ? "Saving..." : "Save roof preview"}</button>
      </div>
    </form>
  );
}
