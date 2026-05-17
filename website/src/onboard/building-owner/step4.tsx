import type { BuildingOwnerStepProps } from "./BuildingOwnerWebOnboarding";

export default function Step4({ form, busy, setForm, goToStep, geocodeAddress, saveBasics }: BuildingOwnerStepProps) {
  return (
    <form className="onboard-pane" onSubmit={saveBasics}>
      <label htmlFor="bo-name">Building name<input id="bo-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
      <label htmlFor="bo-address">
        Address
        <input id="bo-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value, formattedAddress: "" })} onBlur={geocodeAddress} required />
      </label>
      <label htmlFor="bo-units">Unit count<input id="bo-units" inputMode="numeric" value={form.unitCount} onChange={(e) => setForm({ ...form, unitCount: e.target.value })} required /></label>
      <label htmlFor="bo-occ">Occupancy estimate (%)<input id="bo-occ" inputMode="numeric" value={form.occupancy} onChange={(e) => setForm({ ...form, occupancy: e.target.value })} required /></label>
      {form.formattedAddress ? <p className="form-note">Geocoded: {form.formattedAddress}</p> : null}
      <div className="onboard-actions">
        <button type="button" className="ghost-action" onClick={() => goToStep(2)}>Back</button>
        <button type="submit" disabled={busy}>{busy ? "Saving..." : "Continue"}</button>
      </div>
    </form>
  );
}
