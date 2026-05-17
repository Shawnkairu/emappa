import type { HomeownerStepProps } from "./HomeownerOnboarding";

export default function Step4({ form, busy, setForm, goToStep, saveAddress }: HomeownerStepProps) {
  const canContinue = form.name.trim().length > 1 && form.address.trim().length > 4;

  return (
    <form className="onboard-pane" onSubmit={saveAddress}>
      <label htmlFor="homeowner-home-name">
        Home name
        <input id="homeowner-home-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </label>
      <label htmlFor="homeowner-address">
        Address
        <input
          id="homeowner-address"
          value={form.address}
          autoComplete="street-address"
          onChange={(event) => setForm({ ...form, address: event.target.value })}
          placeholder="Kahawa Sukari, Nairobi"
          required
        />
      </label>
      <label htmlFor="homeowner-property-type">
        Property type
        <select
          id="homeowner-property-type"
          value={form.propertyType}
          onChange={(event) => setForm({ ...form, propertyType: event.target.value as typeof form.propertyType })}
        >
          <option value="single_family">Single-family</option>
          <option value="maisonette">Maisonette</option>
          <option value="small_compound">Small compound</option>
          <option value="shop_home">Shop-home</option>
        </select>
      </label>
      <label htmlFor="homeowner-roof-type">
        Roof type, if known
        <input id="homeowner-roof-type" value={form.roofType} onChange={(event) => setForm({ ...form, roofType: event.target.value })} placeholder="Iron sheet, tile, flat slab" />
      </label>
      <div className="onboard-actions">
        <button className="ghost-action" onClick={() => goToStep(2)} type="button">Back</button>
        <button disabled={busy || !canContinue} type="submit">{busy ? "Saving..." : "Confirm property"}</button>
      </div>
    </form>
  );
}
