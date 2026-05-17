import { useState } from "react";
import { ImmersiveEnergyHero } from "@emappa/web-immersive";
import { PortalKpiBar, PortalLedger, PortalPanel, PortalWorkflow } from "../../../components/PortalPrimitives";
import { EnergyTodayChart, GenerationPanel, SyntheticBadge, kwh, kes, pct } from "../../../portal/PortalWidgets";
import type { PortalScreenProps } from "../../../portal/types";

export default function ResidentEnergy({ project, data }: PortalScreenProps) {
  const [range, setRange] = useState<"today" | "30d">("today");
  const view = project.roleViews.resident;
  const hasShares = view.ownedProviderShare > 0;
  const householdGridKwh = project.energy.E_grid / project.project.units;
  const householdBatteryKwh = project.energy.E_battery_used / project.project.units;
  const householdConsumedKwh = view.monthlySolarKwh + householdGridKwh;
  const gridShare = householdConsumedKwh > 0 ? householdGridKwh / householdConsumedKwh : 0;
  const isActivated = view.capacityQueue?.status === "activated" && view.atsActivation?.status === "ready";
  const confidence = loadProfileConfidence(project.drs.score);
  const todayLoadKwh = sum(data.energyToday?.load_kwh) ?? householdConsumedKwh / 30;
  const todaySolarKwh = sum(data.energyToday?.generation_kwh) ?? view.monthlySolarKwh / 30;
  const todayGridKwh = Math.max(0, todayLoadKwh - todaySolarKwh);
  const usageKwh = range === "today" ? todayLoadKwh : householdConsumedKwh;
  const solarKwh = range === "today" ? todaySolarKwh : view.monthlySolarKwh;
  const gridKwh = range === "today" ? todayGridKwh : householdGridKwh;
  const savingsPct = project.project.gridPriceKes > 0
    ? 1 - project.project.solarPriceKes / project.project.gridPriceKes
    : 0;

  return (
    <>
      <ImmersiveEnergyHero project={project} energyToday={data.energyToday} />
      <div className="portal-two-col">
        <PortalPanel eyebrow={isActivated ? "Live energy" : "Projected energy"} title={isActivated ? "Your apartment energy today" : "Expected solar-first split"}>
          <div className="chart-head"><SyntheticBadge source={isActivated ? "mixed" : "synthetic"} /><span>{isActivated ? "meter-backed when available" : "pre-live projection"}</span></div>
          <PortalKpiBar items={[
            { label: "Consumed", value: kwh(usageKwh), detail: range === "today" ? "today" : "30-day estimate" },
            { label: "From e.mappa", value: kwh(solarKwh), detail: "solar-first allocation" },
            { label: "Grid fallback", value: kwh(gridKwh), detail: "kept outside pledge wallet" },
          ]} />
          <PortalWorkflow
            steps={[
              { label: "Solar first", detail: `${kwh(solarKwh)} from the e.mappa path.`, status: pct(solarKwh / Math.max(usageKwh, 1)) },
              { label: "Battery shift", detail: `${kwh(householdBatteryKwh)} monthly stored support.`, status: "time-shift" },
              { label: "KPLC fallback", detail: `${kwh(gridKwh)} remains grid-backed.`, status: pct(gridKwh / Math.max(usageKwh, 1)) },
            ]}
          />
        </PortalPanel>

        <PortalPanel eyebrow="Load profile" title={`${confidence.label} confidence`}>
          <PortalLedger rows={[
            { label: "Profile level", value: confidence.level, note: confidence.detail },
            { label: "Expected monthly load", value: kwh(householdConsumedKwh), note: "resident estimate + project allocation" },
            { label: "Expected savings", value: `${kes(view.savingsKes)} / ${pct(Math.max(0, savingsPct))}`, note: "vs grid-only" },
            { label: "Accuracy action", value: confidence.cta, note: confidence.level === "L1" ? "recommended" : "optional" },
          ]} />
        </PortalPanel>
      </div>

      <div className="filter-bar" aria-label="Energy range">
        <button className={range === "today" ? "active" : ""} onClick={() => setRange("today")} type="button">24h</button>
        <button className={range === "30d" ? "active" : ""} onClick={() => setRange("30d")} type="button">30d</button>
      </div>
      <EnergyTodayChart project={project} today={data.energyToday} />
      <PortalKpiBar items={[
        { label: isActivated ? "Today from solar" : "Projected solar", value: kwh(solarKwh), detail: isActivated ? "meter/day view" : "capacity plan" },
        { label: "Coverage", value: pct(view.solarCoverage), detail: "solar-first household share" },
        { label: "Fallback", value: pct(gridShare), detail: `${kwh(householdGridKwh)} grid support` },
      ]} />
      <div className="portal-two-col">
        <PortalPanel eyebrow="Source mix" title="What your household used">
          <PortalLedger rows={[
            { label: "Consumed", value: kwh(householdConsumedKwh), note: "solar + grid fallback" },
            { label: "From prepaid solar", value: kwh(view.monthlySolarKwh), note: "wallet-backed allocation" },
            { label: "Battery support", value: kwh(householdBatteryKwh), note: "stored project energy" },
            { label: "Grid fallback", value: kwh(householdGridKwh), note: "kept outside pledge wallet" },
            { label: "Saved", value: kes(view.savingsKes), note: "against grid-only" },
          ]} />
        </PortalPanel>
        <GenerationPanel project={project} hasShares={hasShares} />
      </div>

      <PortalPanel eyebrow="Allocation explainer" title="Why generated energy and resident credit differ">
        <PortalWorkflow
          steps={[
            { label: "Measured or projected generation", detail: "The building produces solar on the dedicated e.mappa path.", status: kwh(project.energy.E_gen) },
            { label: "Resident allocation", detail: "Only sold, prepaid solar maps to resident credit.", status: kwh(view.monthlySolarKwh) },
            { label: "Fallback discipline", detail: "KPLC fallback is shown separately and never spends pledge balance.", status: kwh(householdGridKwh) },
          ]}
        />
      </PortalPanel>
    </>
  );
}

function loadProfileConfidence(drsScore: number) {
  if (drsScore >= 85) return { level: "L3", label: "High", detail: "verified enough for high-confidence demand fit", cta: "Current" };
  if (drsScore >= 65) return { level: "L2", label: "Medium", detail: "receipt or appliance detail can improve this", cta: "Improve estimate" };
  return { level: "L1", label: "Low", detail: "fast estimate only", cta: "Complete load estimate" };
}

function sum(values?: number[]) {
  return values?.reduce((total, value) => total + value, 0);
}
