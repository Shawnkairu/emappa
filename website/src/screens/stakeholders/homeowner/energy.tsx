import { ImmersiveEnergyHero } from "@emappa/web-immersive";
import { PortalKpiBar, PortalLedger, PortalPanel, PortalWorkflow } from "../../../components/PortalPrimitives";
import { EnergyTodayChart, GenerationPanel, SyntheticBadge, kes, kwh, pct } from "../../../portal/PortalWidgets";
import type { PortalScreenProps } from "../../../portal/types";

export default function HomeownerEnergy({ project, data }: PortalScreenProps) {
  const resident = project.roleViews.resident;
  const provider = project.roleViews.provider;
  const isLive = project.project.stage === "live";
  const retainedShare = provider.retainedOwnership;
  const soldShare = provider.soldOwnership;
  const todayLoad = sum(data.energyToday?.load_kwh) ?? (project.energy.E_sold + project.energy.E_grid) / 30;
  const todaySolar = sum(data.energyToday?.generation_kwh) ?? project.energy.E_gen / 30;
  const todayBattery = project.energy.E_battery_used / 30;
  const todayGrid = Math.max(0, todayLoad - Math.min(todaySolar, todayLoad));
  const todaySavings = Math.round(Math.min(todaySolar, todayLoad) * Math.max(0, project.project.gridPriceKes - project.project.solarPriceKes));
  const tokenBurnRate = resident.monthlySolarKwh > 0 ? resident.prepaidBalanceKes / resident.monthlySolarKwh : 0;
  const warnings = homeownerWarnings(project.energy.wasteRate, provider.gridFallbackKwh, provider.utilization, provider.monitoringStatus);

  return (
    <>
      <ImmersiveEnergyHero project={project} energyToday={data.energyToday} />
      <PortalKpiBar items={[
        { label: isLive ? "Today consumed" : "Projected monthly load", value: isLive ? kwh(todayLoad) : kwh(project.project.energy.monthlyDemandKwh), detail: "sole household demand" },
        { label: isLive ? "Today from solar" : "Expected generation", value: isLive ? kwh(Math.min(todaySolar, todayLoad)) : kwh(project.energy.E_gen), detail: isLive ? "solar-first share" : "system sizing forecast" },
        { label: isLive ? "KES saved today" : "Expected savings range", value: isLive ? kes(todaySavings) : `${kes(Math.round(resident.savingsKes * 0.8))} - ${kes(Math.round(resident.savingsKes * 1.05))}`, detail: "vs grid-only" },
      ]} />
      {isLive ? (
        <>
          <div className="chart-head"><SyntheticBadge source={data.energyToday ? "mixed" : "synthetic"} /><span>24-hour solar / battery / grid view</span></div>
          <EnergyTodayChart project={project} today={data.energyToday} />
        </>
      ) : (
        <PortalPanel eyebrow="Pre-live projection" title="Expected solar, battery, and grid split">
          <PortalKpiBar items={[
            { label: "Expected battery use", value: kwh(project.energy.E_battery_used), detail: `${project.project.energy.batteryKwh} kWh battery` },
            { label: "Expected grid fallback", value: kwh(project.energy.E_grid), detail: "outside pledge wallet" },
            { label: "Expected utilization", value: pct(provider.utilization), detail: "self-consumption first" },
          ]} />
          <PortalWorkflow steps={[
            { label: "Load profile", detail: `${kwh(project.project.energy.monthlyDemandKwh)} estimated monthly demand.`, status: loadProfileConfidence(project.drs.score) },
            { label: "Solar sizing", detail: `${project.project.energy.arrayKw} kW array expected to produce ${kwh(project.energy.E_gen)} monthly.`, status: pct(project.energy.coverage) },
            { label: "Fallback", detail: `${kwh(project.energy.E_grid)} projected grid support remains separate.`, status: "conservative" },
          ]} />
        </PortalPanel>
      )}
      <div className="portal-two-col">
        <GenerationPanel project={project} alwaysVisible />
        <PortalPanel eyebrow="Share split" title="Rooftop economics at a glance">
          <p>Homeowners see the physical array and the cash position together, so a live demo can connect production to payout without changing screens.</p>
          {soldShare > 0 ? <ShareSplit retained={retainedShare} sold={soldShare} /> : null}
          <PortalLedger rows={[
            { label: "Retained share", value: pct(provider.retainedOwnership), note: "visible to homeowner" },
            { label: "Sold share", value: pct(provider.soldOwnership), note: "provider/financier/resident positions" },
            { label: "Monetized generation", value: kwh(project.energy.E_sold), note: "settlement basis" },
            { label: "Unused generation", value: kwh(provider.wasteKwh), note: "optimization signal" },
          ]} />
        </PortalPanel>
      </div>

      <div className="portal-two-col">
        <PortalPanel eyebrow="System sizing" title="Why this system fits the home">
          <PortalLedger rows={[
            { label: "Array size", value: `${project.project.energy.arrayKw} kW`, note: `${project.project.energy.peakSunHours} peak-sun hours` },
            { label: "Battery size", value: `${project.project.energy.batteryKwh} kWh`, note: `${pct(project.project.energy.batteryDepthOfDischarge)} usable depth` },
            { label: "Inverter fit", value: provider.utilization >= 0.7 ? "Good fit" : "Needs review", note: `${pct(provider.utilization)} utilization` },
            { label: "Sizing doctrine", value: "Self-consumption first", note: "no export earnings projected" },
          ]} />
        </PortalPanel>
        <PortalPanel eyebrow="Consumption timeline" title="Daily, weekly, monthly view">
          <PortalLedger rows={[
            { label: "Daily use", value: kwh((project.energy.E_sold + project.energy.E_grid) / 30), note: `${pct(resident.solarCoverage)} solar coverage` },
            { label: "Weekly use", value: kwh((project.energy.E_sold + project.energy.E_grid) / 4.3), note: `${kes(Math.round(resident.savingsKes / 4.3))} saved vs grid` },
            { label: "Monthly use", value: kwh(project.energy.E_sold + project.energy.E_grid), note: `${kes(resident.savingsKes)} saved vs grid` },
            { label: "Token burn rate", value: tokenBurnRate ? `${kes(tokenBurnRate)} / kWh` : "Pending pledge", note: "wallet-backed solar only" },
          ]} />
        </PortalPanel>
      </div>

      <PortalPanel eyebrow="Warnings and alerts" title={warnings.length ? "Items to watch" : "No energy warnings"}>
        <PortalWorkflow
          steps={(warnings.length ? warnings : [{ label: "System status", detail: "No oversized, under-batteried, under-loaded, or low-production warning is active.", status: "clear" }]).map((warning) => ({
            label: warning.label,
            detail: warning.detail,
            status: warning.status,
          }))}
        />
      </PortalPanel>
    </>
  );
}

function ShareSplit({ retained, sold }: { retained: number; sold: number }) {
  const retainedPct = Math.round(retained * 100);
  return (
    <div className="energy-flow compact" aria-label="Ownership share split">
      <span style={{ width: `${Math.max(8, retainedPct)}%` }}>Homeowner {pct(retained)}</span>
      <span style={{ width: `${Math.max(8, Math.round(sold * 100))}%` }}>Buyers {pct(sold)}</span>
    </div>
  );
}

function homeownerWarnings(wasteRate: number, gridFallbackKwh: number, utilization: number, monitoringStatus: string) {
  const warnings: Array<{ label: string; detail: string; status: string }> = [];
  if (wasteRate > 0.18) {
    warnings.push({ label: "System oversized", detail: "Waste risk can slow payback; size around self-consumption unless trading demand exists.", status: pct(wasteRate) });
  }
  if (gridFallbackKwh > 0 && utilization > 0.85) {
    warnings.push({ label: "Under-batteried", detail: "High utilization with grid fallback suggests storage may be insufficient.", status: kwh(gridFallbackKwh) });
  }
  if (utilization < 0.55) {
    warnings.push({ label: "Under-loaded", detail: "Low utilization can create poor payback unless more demand is added.", status: pct(utilization) });
  }
  if (monitoringStatus.toLowerCase().includes("blocked")) {
    warnings.push({ label: "Data missing", detail: "Monitoring connectivity is blocked; settle conservatively until data quality improves.", status: "conservative" });
  }
  return warnings;
}

function loadProfileConfidence(drsScore: number) {
  if (drsScore >= 85) return "L3 confidence";
  if (drsScore >= 65) return "L2 confidence";
  return "L1 confidence";
}

function sum(values?: number[]) {
  return values?.reduce((total, value) => total + value, 0);
}
