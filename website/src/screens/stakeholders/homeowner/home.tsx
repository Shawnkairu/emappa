import { PortalKpiBar, PortalLedger, PortalPanel, PortalWorkflow } from "../../../components/PortalPrimitives";
import { ProgressBar } from "../../../components/ProgressBar";
import { PilotBanner, ProjectHero, TokenBalanceHero, kes, kwh, pct } from "../../../portal/PortalWidgets";
import type { PortalScreenProps } from "../../../portal/types";

export default function HomeownerHome({ project }: PortalScreenProps) {
  const isLive = project.project.stage === "live";
  const resident = project.roleViews.resident;
  const owner = project.roleViews.owner;
  const provider = project.roleViews.provider;
  const blockers = project.drs.reasons.slice(0, 3);
  const deployment = deploymentProgress(project.project.stage);
  const systemHealth = provider.monitoringStatus || (project.lbrs.score >= 100 ? "System healthy" : "Launch checks pending");
  const uptime = project.lbrs.score >= 100 ? "99.5%" : "Pending LBRS";
  const workflowSteps = isLive ? [
    { label: "Pledge", detail: "Add demand against your live home solar allocation.", status: "ready" },
    { label: "View energy", detail: "Open the always-on generation and usage screen.", status: "live" },
    { label: "Wallet detail", detail: "Track pledges, royalties, and share earnings.", status: "three-stream" },
    { label: "Roof detail", detail: "Review the captured polygon and confidence.", status: "embedded" },
    { label: "System settings", detail: "Review live monitoring and profile controls.", status: systemHealth },
  ] : [
    { label: "View blockers", detail: "Open DRS detail and top readiness gaps.", status: project.drs.decision },
    { label: "Approve terms", detail: "Review homeowner terms before deployment.", status: "embedded" },
    { label: "Compare bill", detail: "Compare current bill against projected e.mappa cost.", status: "embedded" },
    { label: "Deployment timeline", detail: "Track qualifying, funding, installing, and go-live.", status: "pre-live" },
    { label: "Roof detail", detail: "Inspect the satellite roof capture.", status: "embedded" },
    { label: "Edit load profile", detail: "Improve the demand fit before activation locks token flow.", status: "pre-live" },
  ];

  return (
    <>
      <PilotBanner />
      {isLive ? (
        <>
          <TokenBalanceHero project={project} title="Home solar wallet" />
          <div className="portal-two-col">
            <ProjectHero project={project} compact />
            <PortalPanel eyebrow="Live system" title="Health and activation retrospective">
              <PortalLedger rows={[
                { label: "DRS", value: `${project.drs.score}/100`, note: project.drs.label },
                { label: "LBRS", value: `${project.lbrs.score}/100`, note: project.lbrs.label },
                { label: "System uptime", value: uptime, note: systemHealth },
                { label: "Current alerts", value: String(project.roleViews.admin.alertCount), note: provider.openMaintenanceTickets ? `${provider.openMaintenanceTickets} maintenance tickets` : "no open ticket count" },
              ]} />
            </PortalPanel>
          </div>
          <PortalKpiBar items={[
            { label: "Live pledge balance", value: kes(resident.prepaidBalanceKes), detail: "usable after go-live" },
            { label: "Today's solar", value: kwh(project.energy.E_sold / 30), detail: "monetized home share" },
            { label: "Retained ownership", value: pct(provider.retainedOwnership), detail: "homeowner position" },
          ]} />
          <PortalPanel eyebrow="Action rail" title="Keep the live account moving">
            <PortalWorkflow steps={workflowSteps} />
          </PortalPanel>
        </>
      ) : (
        <>
          <ProjectHero project={project} />
          <div className="portal-two-col">
            <PortalPanel eyebrow="Deployment progress" title="Cooking up your energy project">
              <ProgressBar value={deployment.percent / 100} label={`${deployment.percent}% toward go-live`} />
              <PortalLedger rows={[
                { label: "Project stage", value: stageLabel(project.project.stage), note: "qualifying → funding → installing → live" },
                { label: "DRS decision", value: project.drs.label, note: `${project.drs.score}/100 readiness` },
                { label: "Resident-style coverage", value: pct(owner.prepaidCoverage), note: `${owner.prepaidMonthsCovered} months signaled` },
              ]} />
            </PortalPanel>
            <TokenBalanceHero project={project} title="Tokens activate once your project goes live" disabled />
          </div>
          <div className="portal-two-col">
            <PortalPanel eyebrow="Top blockers" title={blockers.length ? "Readiness gaps" : "No current blockers"}>
              <PortalLedger
                rows={(blockers.length ? blockers : ["No active blocker reported"]).map((blocker, index) => ({
                  label: blockers.length ? `Blocker ${index + 1}` : "Status",
                  value: blocker,
                  note: blockers.length ? "DRS owner follow-up" : "continue monitoring",
                }))}
              />
            </PortalPanel>
            <PortalPanel eyebrow="Action rail" title="Pre-live next steps">
              <PortalWorkflow steps={workflowSteps} />
            </PortalPanel>
          </div>
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
