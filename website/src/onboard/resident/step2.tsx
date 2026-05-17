export type ResidentBuildingMatch = {
  id: string;
  name: string;
  address: string;
  unitNumber: string;
  source: "invite" | "manual";
};

export function ResidentStep2ConfirmBuilding({
  building,
  onBack,
  onConfirm,
}: {
  building: ResidentBuildingMatch;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="onboard-pane">
      <div className="terms-preview">
        <p className="roof-map-placeholder" style={{ minHeight: "auto", padding: 16 }}>
          <strong>{building.name}</strong>
          <small>{building.address}</small>
        </p>
        <p>Confirm this is the building and unit where your household participates.</p>
      </div>
      <div className="pledge-preview">
        <span>{building.source === "invite" ? "Invite matched" : "Manual fallback"}</span>
        <strong>{building.unitNumber}</strong>
        <small>Unit and meter details can be edited from Profile before activation.</small>
      </div>
      <div className="onboard-actions">
        <button className="ghost-action" type="button" onClick={onBack}>Back</button>
        <button type="button" onClick={onConfirm}>This is my building</button>
      </div>
    </div>
  );
}
