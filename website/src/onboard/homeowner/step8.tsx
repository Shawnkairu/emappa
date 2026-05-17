import type { HomeownerStepProps } from "./HomeownerOnboarding";

export default function Step8({ form, busy, setForm, goToStep, saveRoofCapture }: HomeownerStepProps) {
  const canContinue = Number.isFinite(form.roofArea) && form.roofArea >= 10 && form.equipmentLocation.trim().length > 2;

  return (
    <form className="onboard-pane" onSubmit={saveRoofCapture}>
      <div className="roof-map-placeholder" aria-label="Satellite roof capture preview">
        <span>Satellite roof capture</span>
        <small>{form.roofArea} sqm typed estimate</small>
      </div>
      <label htmlFor="homeowner-roof-area">
        Available roof area, sqm
        <input id="homeowner-roof-area" type="number" min={10} step={1} value={form.roofArea} onChange={(event) => setForm({ ...form, roofArea: Number(event.target.value) })} />
      </label>
      <label htmlFor="homeowner-shade-notes">
        Shade or obstruction notes
        <textarea id="homeowner-shade-notes" value={form.shadeNotes} onChange={(event) => setForm({ ...form, shadeNotes: event.target.value })} />
      </label>
      <label htmlFor="homeowner-equipment-location">
        Preferred equipment location
        <input id="homeowner-equipment-location" value={form.equipmentLocation} onChange={(event) => setForm({ ...form, equipmentLocation: event.target.value })} placeholder="DB room, garage wall, outdoor cabinet" />
      </label>
      <label htmlFor="homeowner-connectivity">
        Connectivity
        <select id="homeowner-connectivity" value={form.connectivity} onChange={(event) => setForm({ ...form, connectivity: event.target.value })}>
          <option value="wifi">Reliable WiFi</option>
          <option value="cellular">Cellular available</option>
          <option value="unknown">Needs check</option>
        </select>
      </label>
      <label htmlFor="homeowner-access-notes">
        Access constraints
        <textarea id="homeowner-access-notes" value={form.accessNotes} onChange={(event) => setForm({ ...form, accessNotes: event.target.value })} />
      </label>
      <div className="onboard-actions">
        <button className="ghost-action" onClick={() => goToStep(6)} type="button">Back</button>
        <button disabled={busy || !canContinue} type="submit">{busy ? "Saving..." : "Save site preview"}</button>
      </div>
    </form>
  );
}
