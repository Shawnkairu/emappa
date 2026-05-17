import { PortalKpiBar, PortalLedger, PortalPanel, PortalWorkflow } from "../../../components/PortalPrimitives";
import { ProgressBar } from "../../../components/ProgressBar";
import { PilotBanner, ProjectHero, kes, kwh, pct } from "../../../portal/PortalWidgets";
import type { PortalScreenProps } from "../../../portal/types";

export default function BuildingOwnerHome({ project }: PortalScreenProps) {
  const view = project.roleViews.owner;
  const provider = project.roleViews.provider;
  const resident = project.roleViews.resident;
  const isLive = project.project.stage === "live";
  const hasBuilding = Boolean(project.project.id);
  const pledgedKwh = project.project.solarPriceKes > 0 ? project.project.prepaidCommittedKes / project.project.solarPriceKes : resident.monthlySolarKwh;
  const pledgerCount = Math.max(1, Math.round(view.residentParticipation * project.project.units));
  const availableKw = Math.max(0, project.project.energy.arrayKw * provider.utilization);
  const apartmentsPerPhase = Math.max(1, Math.floor(project.project.units / 3));
  const deployment = deploymentProgress(project.project.stage);
  const blockers = project.drs.reasons.slice(0, 3);

  if (!hasBuilding) {
    return (
      <>
        <PilotBanner>Building owner pilot view — start with one hosted roof before demand, DRS, and terms appear.</PilotBanner>
        <PortalPanel eyebrow="No building yet" title="Start a hosted rooftop project">
          <p>Create a building profile to begin roof capture, resident demand gathering, and readiness review.</p>
          <PortalWorkflow steps={[
            { label: "Start project", detail: "Open the building-owner onboarding flow.", status: "required" },
            { label: "Capture roof", detail: "Add roof access, usable area, and authority evidence.", status: "next" },
            { label: "Invite residents", detail: "Demand and capacity queue appear after the building exists.", status: "locked" },
          ]} />
        </PortalPanel>
      </>
    );
  }

  return (
    <>
      <PilotBanner>Building owner pilot view — resident participation is aggregated and private finances stay hidden.</PilotBanner>
      {isLive ? (
        <>
          <div className="portal-two-col">
            <PortalPanel eyebrow="Building overview" title={project.project.name}>
              <PortalLedger rows={[
                { label: "Address", value: project.project.locationBand, note: "hosted apartment building" },
                { label: "Units", value: String(project.project.units), note: "ATS nodes tracked in aggregate" },
                { label: "Roof polygon", value: `${project.project.energy.arrayKw} kW array`, note: "roof detail embedded" },
                { label: "Go-live", value: "Live", note: "LBRS launch packet accepted" },
              ]} />
            </PortalPanel>
            <ProjectHero project={project} compact />
          </div>
          <PortalKpiBar items={[
            { label: "Array output today", value: kwh(project.energy.E_gen / 30), detail: "dedicated solar path" },
            { label: "Building consumption", value: kwh((project.energy.E_sold + project.energy.E_grid) / 30), detail: "aggregate load" },
            { label: "Solar served", value: kwh(project.energy.E_sold / 30), detail: "monetized only" },
            { label: "Royalty this month", value: kes(view.monthlyRoyaltyKes), detail: "host stream" },
          ]} />
          <div className="portal-two-col">
            <PortalPanel eyebrow="System health" title="Live building state">
              <PortalLedger rows={[
                { label: "DRS / LBRS", value: `${project.drs.score}% / ${project.lbrs.score}%`, note: `${project.drs.label}; ${project.lbrs.label}` },
                { label: "Inverter", value: provider.monitoringStatus.includes("online") ? "Online" : "Review", note: provider.monitoringStatus },
                { label: "Battery SoC", value: pct(Math.min(1, project.project.energy.batteryKwh / Math.max(project.project.energy.monthlyDemandKwh / 30, 1))), note: "synthetic state of charge" },
                { label: "Solar DB", value: provider.monitoringStatus, note: "data gateway" },
                { label: "ATS fault count", value: String(provider.openMaintenanceTickets), note: "maintenance tickets as proxy" },
                { label: "Last updated", value: "Today", note: "pilot snapshot" },
              ]} />
            </PortalPanel>
            <PortalPanel eyebrow="Building visual" title="Roof to apartments flow">
              <PortalWorkflow steps={[
                { label: "Roof array", detail: `${kwh(project.energy.E_gen / 30)} generated today.`, status: "solar" },
                { label: "Inverter + battery", detail: `${kwh(project.energy.E_battery_used / 30)} battery support.`, status: "buffer" },
                { label: "Solar DB", detail: "Dedicated e.mappa path routes to ATS nodes.", status: "protected" },
                { label: "Apartments + KPLC", detail: `${kwh(project.energy.E_grid / 30)} fallback remains grid-backed.`, status: "fallback" },
              ]} />
            </PortalPanel>
          </div>
          <PortalPanel eyebrow="Action rail" title="Live building actions">
            <PortalWorkflow steps={[
              { label: "View energy", detail: "Open aggregate generation, consumption, and flows.", status: "energy tab" },
              { label: "Wallet", detail: "Review host royalty and optional ownership earnings.", status: "wallet tab" },
              { label: "System settings", detail: "Inspect monitoring and profile controls.", status: "profile" },
              { label: "Maintenance request", detail: "Open a support path for inverter, ATS, or DB issues.", status: provider.openMaintenanceTickets ? "active" : "clear" },
              { label: "Roof detail", detail: "Review polygon and evidence.", status: "embedded" },
            ]} />
          </PortalPanel>
        </>
      ) : (
        <>
          <ProjectHero project={project} />
          <div className="portal-two-col">
            <PortalPanel eyebrow="Building card" title={project.project.name}>
              <PortalLedger rows={[
                { label: "Address", value: project.project.locationBand, note: "hosted apartment building" },
                { label: "Units", value: String(project.project.units), note: "resident capacity basis" },
                { label: "Roof thumbnail", value: `${project.project.energy.arrayKw} kW planned`, note: "polygon detail embedded" },
                { label: "Stage", value: stageLabel(project.project.stage), note: "pre-live" },
              ]} />
            </PortalPanel>
            <PortalPanel eyebrow="Deployment progress" title="Qualifying to live">
              <ProgressBar value={deployment.percent / 100} label={`${deployment.percent}% toward go-live`} />
              <PortalLedger rows={[
                { label: "DRS decision", value: project.drs.label, note: `${project.drs.score}/100` },
                { label: "Top blocker count", value: String(blockers.length), note: blockers[0] ?? "no blocker reported" },
                { label: "Verification docs", value: view.verificationDocuments?.status.replace(/_/g, " ") ?? "in review", note: view.verificationDocuments?.detail ?? "owner authority packet" },
              ]} />
            </PortalPanel>
          </div>
          <PortalKpiBar items={[
            { label: "Pledged demand", value: kwh(pledgedKwh), detail: `${kes(project.project.prepaidCommittedKes)} signaled` },
            { label: "Pledgers", value: String(pledgerCount), detail: `${pct(view.residentParticipation)} participation` },
            { label: "Queue status", value: resident.capacityQueue.status.replace(/_/g, " "), detail: resident.capacityQueue.detail },
            { label: "Available capacity", value: `${availableKw.toFixed(1)} kW`, detail: `${apartmentsPerPhase} apartments / phase` },
          ]} />
          <div className="portal-two-col">
            <PortalPanel eyebrow="Resident demand" title="Capacity and phasing estimate">
              <PortalLedger rows={[
                { label: "Available kW", value: `${availableKw.toFixed(1)} kW`, note: "projected from planned array utilization" },
                { label: "Apartments per phase", value: String(apartmentsPerPhase), note: "capacity estimate" },
                { label: "Phase timeline", value: "Qualify → fund → install → activate", note: "depends on DRS/LBRS gates" },
                { label: "Queue status", value: resident.capacityQueue.status.replace(/_/g, " "), note: resident.capacityQueue.detail },
              ]} />
            </PortalPanel>
            <PortalPanel eyebrow="Host royalty education" title="You earn from roof/site hosting">
              <p>No host cashflow is shown before revenue exists. Live royalties come only from monetized solar, not resident pledges.</p>
              <PortalWorkflow steps={[
                { label: "Host rooftop", detail: "Provide verified roof/site access and authority documents.", status: "owner role" },
                { label: "Clear gates", detail: "DRS/LBRS must pass before revenue can exist.", status: project.drs.decision },
                { label: "Earn live royalty", detail: "Royalty appears after solar is sold through the building.", status: "hidden pre-live" },
              ]} />
            </PortalPanel>
          </div>
          <PortalPanel eyebrow="Action rail" title="Resolve the lease-to-rooftop path">
            <PortalWorkflow steps={[
              { label: "View blockers", detail: "Open DRS detail with all six components.", status: project.drs.decision },
              { label: "Compare to today's bill", detail: "Grid bill vs projected e.mappa building cost.", status: "embedded" },
              { label: "Resident roster", detail: "View pledge participation without private finances.", status: "embedded" },
              { label: "Approve terms", detail: "Confirm owner royalty terms.", status: "embedded" },
              { label: "Roof detail", detail: "Inspect roof polygon and evidence.", status: "embedded" },
              { label: "Deployment timeline", detail: "Track qualifying, funding, installing, live.", status: "embedded" },
            ]} />
          </PortalPanel>
        </>
      )}
    </>
  );
}

function deploymentProgress(stage: string) {
  const stages = ["listed", "qualifying", "funding", "installing", "live"];
  const index = Math.max(0, stages.indexOf(stage));
  return { percent: Math.round(((index + 1) / stages.length) * 100) };
}

function stageLabel(stage: string) {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
