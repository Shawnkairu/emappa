import { ImmersiveEnergyHero } from "@emappa/web-immersive";
import { PortalKpiBar, PortalLedger, PortalPanel, PortalWorkflow } from "../../../components/PortalPrimitives";
import { PilotBanner, TokenBalanceHero, kes, kwh, pct } from "../../../portal/PortalWidgets";
import type { PortalScreenProps } from "../../../portal/types";

export default function ResidentHome({ project, data }: PortalScreenProps) {
  const view = project.roleViews.resident;
  const history = data.prepaidHistory.slice(0, 3);
  const pledgedTotal = data.prepaidBalance?.confirmed_total_kes ?? view.prepaidBalanceKes;
  const hasPledge = pledgedTotal > 0;
  const queue = view.capacityQueue;
  const atsStatus = view.atsActivation?.status ?? "pending";
  const availability = availabilityState(project.project.stage, queue?.status, atsStatus);
  const isLive = availability.id === "A6";
  const canBuyTokens = isLive && queue?.status === "activated";
  const confidence = loadProfileConfidence(project.drs.score);
  const todaysSolar = project.energy.E_sold / 30 / Math.max(project.project.units, 1);
  const todaysGrid = project.energy.E_grid / 30 / Math.max(project.project.units, 1);
  const estimatedKwhBalance = pledgedTotal > 0 ? pledgedTotal / project.project.solarPriceKes : 0;
  const fallbackRows = [
    { id: "demo-1", amountKes: view.prepaidBalanceKes, status: hasPledge ? "confirmed" : "pilot estimate", createdAt: new Date().toISOString() },
  ];

  return (
    <>
      <PilotBanner>Pledges are non-binding, resident balances stay separate from grid fallback, and no money is charged in this demo.</PilotBanner>
      <ImmersiveEnergyHero project={project} energyToday={data.energyToday} />
      {isLive ? (
        <TokenBalanceHero project={project} title="Resident token balance" disabled={!canBuyTokens} />
      ) : (
        <PortalPanel eyebrow="Building availability" title={availability.label}>
          <PortalKpiBar items={[
            { label: "Building", value: project.project.name, detail: project.project.locationBand },
            { label: "Unit", value: "Assigned resident unit", detail: "unit number lands from resident profile" },
            { label: "Meter", value: atsStatus === "ready" ? "Mapped" : "Pending", detail: view.atsActivation?.evidenceLabel ?? "PAYG/ATS mapping required" },
          ]} />
          <PortalWorkflow
            steps={[
              { label: "State", detail: availability.detail, status: availability.id },
              { label: "Action", detail: availability.action, status: "next" },
              { label: "Mutex", detail: "Buy tokens stays hidden until this apartment is activated and capacity-cleared.", status: "enforced" },
            ]}
          />
        </PortalPanel>
      )}

      <PortalPanel eyebrow="Today" title="What your pledge unlocks">
        <PortalKpiBar items={[
          { label: "Wallet status", value: hasPledge ? "Pledged" : "Pending", detail: hasPledge ? "edit/cancel allowed pre-activation" : "pledge needed for allocation" },
          { label: "Solar allocation", value: kwh(view.monthlySolarKwh), detail: `${pct(view.solarCoverage)} household coverage` },
          { label: "Bill impact", value: kes(view.savingsKes), detail: "estimated savings vs grid-only" },
        ]} />
        <PortalWorkflow
          steps={[
            { label: "Pledge", detail: hasPledge ? `${kes(pledgedTotal)} confirmed for this resident wallet.` : "Add a pilot pledge to reserve prepaid solar.", status: hasPledge ? "confirmed" : "open" },
            { label: "Allocate", detail: "Confirmed pledge maps to the household solar share first.", status: pct(view.solarCoverage) },
            { label: "Fallback", detail: "Grid usage remains visible and never spends the pledge balance.", status: "protected" },
          ]}
        />
      </PortalPanel>

      <div className="portal-two-col">
        <PortalPanel eyebrow="Capacity queue" title={queueStatusLabel(queue?.status)}>
          <PortalKpiBar items={[
            { label: "Position", value: queue ? `#${queue.position}` : "—", detail: "priority is timestamp + load fit + confidence + equity guardrail" },
            { label: "Priority", value: confidence.label, detail: `load profile ${confidence.level}` },
            { label: "Activation", value: queue?.status === "activated" ? "Active" : "Projected", detail: queue?.detail ?? "Capacity status uses pilot evidence." },
          ]} />
          <PortalLedger rows={[
            { label: "Queue status", value: queueStatusLabel(queue?.status), note: queue?.status ?? "capacity_review" },
            { label: "ATS state", value: atsStatus.replace(/_/g, " "), note: view.atsActivation?.detail ?? "Apartment ATS is not active yet." },
            { label: "Buy tokens", value: canBuyTokens ? "Available" : "Hidden", note: canBuyTokens ? "post-activation only" : "A5 mutex protected" },
          ]} />
        </PortalPanel>

        <PortalPanel eyebrow="DRS demand" title={`${project.drs.score} / 100`}>
          <PortalKpiBar items={[
            { label: "Building DRS", value: project.drs.label, detail: project.drs.reasons[0] ?? "No visible blocker." },
            { label: "Load confidence", value: confidence.label, detail: confidence.detail },
            { label: "Resident signal", value: hasPledge ? kes(pledgedTotal) : "No pledge", detail: "contributes to demand proof" },
          ]} />
          <PortalWorkflow
            steps={[
              { label: "Improve load profile", detail: confidence.cta, status: confidence.level },
              { label: "Open DRS detail", detail: "Review blockers and project readiness.", status: project.drs.decision },
            ]}
          />
        </PortalPanel>
      </div>

      <div className="portal-two-col">
        <PortalPanel eyebrow="Recent activity" title="Latest pledge rows">
          <PortalLedger
            rows={(history.length ? history : fallbackRows).map((row) => ({
              label: new Date(row.createdAt).toLocaleDateString(),
              value: kes(row.amountKes),
              note: row.status,
            }))}
          />
        </PortalPanel>
        <PortalPanel eyebrow={isLive ? "Live supply" : "Next action"} title={isLive ? "e.mappa solar vs KPLC" : availability.action}>
          <PortalLedger rows={[
            { label: "Current source", value: isLive ? "e.mappa solar" : "KPLC fallback", note: atsStatus.replace(/_/g, " ") },
            { label: "Today solar", value: kwh(todaysSolar), note: "resident allocation estimate" },
            { label: "Grid fallback", value: kwh(todaysGrid), note: "kept outside pledge wallet" },
            { label: "Estimated balance", value: kwh(estimatedKwhBalance), note: `${kes(pledgedTotal)} at pilot solar price` },
            { label: "System health", value: project.drs.reasons.length ? "Warnings" : "All green", note: project.drs.reasons[0] ?? "No latest incident." },
          ]} />
        </PortalPanel>
      </div>

      <PortalPanel eyebrow="Invite tools" title="Bring your owner and neighbors into the demand signal">
        <PortalKpiBar items={[
          { label: "Building code", value: project.project.id, detail: "shareable building reference" },
          { label: "Owner invite", value: "Ready", detail: "ask owner to approve project terms" },
          { label: "Neighbor invite", value: "Ready", detail: "more pledges improve demand proof" },
        ]} />
      </PortalPanel>
    </>
  );
}

function availabilityState(stage: string, queueStatus = "capacity_review", atsStatus = "pending") {
  if (queueStatus === "activated" && atsStatus === "ready") {
    return { id: "A6", label: "Live and connected", detail: "Your unit is activated for the e.mappa path.", action: "Buy or top up tokens" };
  }
  if (stage === "verification" || stage === "live") {
    return { id: "A5", label: "Solar installed, your unit not yet connected", detail: "ATS activation is still pending for this apartment.", action: "Wait for ATS activation steps" };
  }
  if (stage === "install") {
    return { id: "A4", label: "Installation in progress", detail: "Project hardware work is underway.", action: "Confirm unit and meter-room access" };
  }
  if (stage === "funding" || stage === "supplier") {
    return { id: "A3", label: "Funding / provider coordination", detail: "Capacity slots and provider commitments are being assembled.", action: "Stay in the capacity queue" };
  }
  if (stage === "review" || queueStatus === "capacity_review") {
    return { id: "A2", label: "Project organizing / DRS", detail: "Deployment readiness is being reviewed.", action: "Improve pledge and load-profile evidence" };
  }
  if (stage === "inspection" || stage === "pre_onboarding") {
    return { id: "A1", label: "Owner joined, no project started", detail: "The building is known but not yet deployment-ready.", action: "Add a pledge and load estimate" };
  }
  return { id: "A0", label: "e.mappa is not active here yet", detail: "Your pledge and invites help prove demand.", action: "Invite owner or neighbors" };
}

function queueStatusLabel(status = "capacity_review") {
  const labels: Record<string, string> = {
    interested: "Interested",
    pledged: "Pledged",
    capacity_review: "Capacity review",
    capacity_cleared: "Capacity cleared",
    queued: "Queued",
    waitlisted: "Waitlisted",
    activated: "Activated",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

function loadProfileConfidence(drsScore: number) {
  if (drsScore >= 85) return { level: "L3", label: "High", detail: "verified enough for high-confidence demand fit", cta: "Keep load profile current." };
  if (drsScore >= 65) return { level: "L2", label: "Medium", detail: "receipt or appliance detail can improve this", cta: "Upload receipt or refine appliance split." };
  return { level: "L1", label: "Low", detail: "fast estimate only", cta: "Complete the load-profile editor." };
}
