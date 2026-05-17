export type ResidentLoadProfileDraft = {
  monthlySpendKes: string;
  applianceProfile: string[];
  daytimePattern: "mostly_daytime" | "mostly_evening" | "balanced";
  receiptName: string;
};

const appliances = ["Fridge", "TV", "Iron", "Kettle", "Laptop", "Water pump"];

export function ResidentStep3LoadProfile({
  draft,
  onBack,
  onChange,
  onContinue,
}: {
  draft: ResidentLoadProfileDraft;
  onBack: () => void;
  onChange: (draft: ResidentLoadProfileDraft) => void;
  onContinue: () => void;
}) {
  function toggleAppliance(appliance: string) {
    const applianceProfile = draft.applianceProfile.includes(appliance)
      ? draft.applianceProfile.filter((item) => item !== appliance)
      : [...draft.applianceProfile, appliance];
    onChange({ ...draft, applianceProfile });
  }

  return (
    <div className="onboard-pane">
      <label htmlFor="resident-kplc-spend">
        Typical KPLC spend (KES/month)
        <input
          id="resident-kplc-spend"
          inputMode="numeric"
          value={draft.monthlySpendKes}
          onChange={(event) => onChange({ ...draft, monthlySpendKes: event.target.value })}
          placeholder="2500"
          required
        />
      </label>
      <div className="filter-bar" aria-label="Appliance checklist">
        {appliances.map((appliance) => (
          <button
            key={appliance}
            className={draft.applianceProfile.includes(appliance) ? "active" : ""}
            onClick={() => toggleAppliance(appliance)}
            type="button"
          >
            {appliance}
          </button>
        ))}
      </div>
      <label htmlFor="resident-daytime-pattern">
        Daytime / evening pattern
        <select
          id="resident-daytime-pattern"
          value={draft.daytimePattern}
          onChange={(event) => onChange({ ...draft, daytimePattern: event.target.value as ResidentLoadProfileDraft["daytimePattern"] })}
        >
          <option value="balanced">Balanced day and evening</option>
          <option value="mostly_daytime">Mostly daytime</option>
          <option value="mostly_evening">Mostly evening</option>
        </select>
      </label>
      <label htmlFor="resident-receipt">
        Optional receipt photo name
        <input
          id="resident-receipt"
          value={draft.receiptName}
          onChange={(event) => onChange({ ...draft, receiptName: event.target.value })}
          placeholder="receipt-may.jpg"
        />
      </label>
      <div className="onboard-actions">
        <button className="ghost-action" type="button" onClick={onBack}>Back</button>
        <button type="button" onClick={onContinue}>Continue</button>
      </div>
    </div>
  );
}
