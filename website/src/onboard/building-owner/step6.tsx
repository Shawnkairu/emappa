import type { BuildingOwnerStepProps } from "./BuildingOwnerWebOnboarding";

export default function Step6({ form, setForm, goToStep }: BuildingOwnerStepProps) {
  const canContinue = form.roofAccess.trim().length > 2 && form.meterAreaLocation.trim().length > 2;

  return (
    <div className="onboard-pane">
      <label htmlFor="bo-roof-type">Roof type<input id="bo-roof-type" value={form.roofType} onChange={(e) => setForm({ ...form, roofType: e.target.value })} placeholder="Flat slab, mabati, tile" /></label>
      <label htmlFor="bo-roof-access">Roof access<input id="bo-roof-access" value={form.roofAccess} onChange={(e) => setForm({ ...form, roofAccess: e.target.value })} placeholder="Stairwell, ladder, locked hatch" /></label>
      <label htmlFor="bo-shade">Known shaded areas<textarea id="bo-shade" value={form.shadedAreas} onChange={(e) => setForm({ ...form, shadedAreas: e.target.value })} /></label>
      <label htmlFor="bo-meter-area">Meter area location<input id="bo-meter-area" value={form.meterAreaLocation} onChange={(e) => setForm({ ...form, meterAreaLocation: e.target.value })} placeholder="Ground floor DB room" /></label>
      <label htmlFor="bo-pain-points">Resident energy pain points<textarea id="bo-pain-points" value={form.residentPainPoints} onChange={(e) => setForm({ ...form, residentPainPoints: e.target.value })} /></label>
      <div className="onboard-actions">
        <button type="button" className="ghost-action" onClick={() => goToStep(4)}>Back</button>
        <button type="button" disabled={!canContinue} onClick={() => goToStep(6)}>Continue</button>
      </div>
    </div>
  );
}
