import { useState } from "react";
import { PortalKpiBar, PortalLedger, PortalPanel, PortalTable, PortalWorkflow } from "../../../components/PortalPrimitives";
import { PilotBanner, TokenBalanceHero, WalletTransactions, kes, kwh, pct } from "../../../portal/PortalWidgets";
import type { PortalScreenProps } from "../../../portal/types";

type WalletSegment = "cashflow" | "ownership" | "pledges";

const segments: Array<{ id: WalletSegment; label: string }> = [
  { id: "cashflow", label: "Cashflow" },
  { id: "ownership", label: "Ownership" },
  { id: "pledges", label: "Pledges" },
];

export default function HomeownerWallet({ project, data }: PortalScreenProps) {
  const [activeSegment, setActiveSegment] = useState<WalletSegment>(project.project.stage === "live" ? "cashflow" : "pledges");
  const resident = project.roleViews.resident;
  const provider = project.roleViews.provider;
  const cashBalance = data.walletBalance?.kes ?? 0;
  const confirmedPledges = data.prepaidBalance?.confirmed_total_kes ?? resident.prepaidBalanceKes;
  const isLive = project.project.stage === "live";
  const hostRoyaltyKes = 0;
  const avoidedGridCostKes = resident.savingsKes;
  const externalShareEarningsKes = provider.soldOwnership > 0 ? provider.monthlyPayoutKes : 0;
  const currentValuationKes = Math.round(project.project.capitalRequiredKes * provider.retainedOwnership);
  const sharePriceKes = Math.round(project.project.capitalRequiredKes / 100);
  const pledgeRows = data.prepaidHistory.length
    ? data.prepaidHistory
    : [{
        id: "homeowner-pilot-pledge",
        createdAt: new Date().toISOString(),
        amountKes: confirmedPledges,
        status: confirmedPledges > 0 ? "confirmed" : "pending",
      }];
  const cashflowRows = data.walletTransactions.length
    ? data.walletTransactions.map((row) => [
        new Date(row.at).toLocaleDateString(),
        row.kind.replace(/_/g, " "),
        kes(row.amountKes),
        row.reference,
      ])
    : [
        [new Date().toLocaleDateString(), "solar delivered", kes(0), "Self-consumption is shown as avoided grid cost, not cash income"],
        [new Date().toLocaleDateString(), "avoided grid cost", kes(avoidedGridCostKes), "Savings vs grid-only bill"],
        [new Date().toLocaleDateString(), "ownership payout", kes(externalShareEarningsKes), "External monetization only"],
      ];

  return (
    <>
      <PilotBanner>Homeowner wallet keeps self-consumption savings separate from ownership payouts; no host royalty is paid on your own roof.</PilotBanner>
      <PortalKpiBar items={[
        { label: "Pledged total", value: isLive ? "Pre-live only" : kes(confirmedPledges), detail: "non-binding demand signal" },
        { label: "Host royalty", value: kes(hostRoyaltyKes), detail: "homeowners do not earn host royalty from own roof" },
        { label: "Share earnings", value: kes(externalShareEarningsKes), detail: "external monetization only" },
      ]} />

      <PortalPanel eyebrow="Wallet sections" title="Three streams, no self-payment">
        <div className="portal-tabbar" role="tablist" aria-label="Homeowner wallet sections">
          {segments.map((segment) => (
            <button
              key={segment.id}
              className={activeSegment === segment.id ? "active" : ""}
              onClick={() => setActiveSegment(segment.id)}
              role="tab"
              type="button"
              aria-selected={activeSegment === segment.id}
            >
              {segment.label}
            </button>
          ))}
        </div>
        <PortalWorkflow steps={[
          { label: "Pledges / tokens", detail: "Token spend and avoided grid cost are visible, but not counted as homeowner income.", status: isLive ? "live" : "pre-live" },
          { label: "Host royalty", detail: "Always zero for a single-family homeowner using their own roof.", status: kes(hostRoyaltyKes) },
          { label: "Ownership", detail: "Payouts require external sources such as export credit, trading, or third-party consumption.", status: provider.soldOwnership > 0 ? "conditional" : "none" },
        ]} />
      </PortalPanel>

      {activeSegment === "cashflow" && (
        <div className="portal-two-col">
          <PortalPanel eyebrow="Cashflow" title={isLive ? "Chronological account ledger" : "Cashflow activates at go-live"}>
            <PortalTable columns={["Date", "Type", "Amount", "Description"]} rows={cashflowRows} />
          </PortalPanel>
          <PortalPanel eyebrow="Separation rule" title="Savings are not cash earned from yourself">
            <PortalLedger rows={[
              { label: "Wallet balance", value: kes(cashBalance), note: "cash account only" },
              { label: "Token spend", value: isLive ? kes(confirmedPledges) : "Pending go-live", note: "energy wallet stream" },
              { label: "Avoided grid cost", value: kes(avoidedGridCostKes), note: `${kwh(resident.monthlySolarKwh)} solar-first use` },
              { label: "Ownership payout", value: kes(externalShareEarningsKes), note: "external monetization only" },
              { label: "Maintenance / platform", value: kes(project.settlement.reserve + project.settlement.emappaFee), note: "deducted from monetized pool" },
            ]} />
          </PortalPanel>
        </div>
      )}

      {activeSegment === "ownership" && (
        <div className="portal-two-col">
          <PortalPanel eyebrow="Ownership position" title="Array and buy-back view">
            <PortalLedger rows={[
              { label: "Array / asset", value: project.project.name, note: project.project.locationBand },
              { label: "Ownership retained", value: pct(provider.retainedOwnership), note: provider.soldOwnership > 0 ? `${pct(provider.soldOwnership)} sold to buyers` : "homeowner retains full position" },
              { label: "Current valuation", value: kes(currentValuationKes), note: valuationMethod(project.project.stage) },
              { label: "Share price per unit", value: kes(sharePriceKes), note: "illustrative unit basis" },
              { label: "Projected payouts", value: kes(externalShareEarningsKes), note: "only if export/trading/third-party consumption is enabled" },
            ]} />
          </PortalPanel>
          <PortalPanel eyebrow="Buy-back" title={provider.soldOwnership > 0 ? "Marketplace buy-back available" : "No shares sold"}>
            <PortalWorkflow steps={[
              { label: "Open asset detail", detail: "Review valuation, ownership history, and payout basis.", status: "asset-detail" },
              { label: "Buy back shares", detail: provider.soldOwnership > 0 ? "Reacquire sold shares through marketplace buy-back." : "Hidden until shares are sold.", status: provider.soldOwnership > 0 ? "available" : "not needed" },
              { label: "Transfer history", detail: "Ownership transfers appear after a marketplace event.", status: data.walletTransactions.length ? "has ledger" : "empty" },
            ]} />
          </PortalPanel>
        </div>
      )}

      {activeSegment === "pledges" && (
        <div className="portal-two-col">
          <TokenBalanceHero project={project} title={isLive ? "Token wallet" : "Pre-live pledge wallet"} disabled={!isLive} />
          <PortalPanel eyebrow="Pledges" title={isLive ? "Archived pledge history" : "Editable pledge history"}>
            <PortalLedger
              rows={pledgeRows.map((pledge) => ({
                label: new Date(pledge.createdAt).toLocaleDateString(),
                value: kes(pledge.amountKes),
                note: pledge.status === "confirmed" ? "active" : pledge.status === "failed" ? "archived" : "active",
                status: isLive ? "archived" : "edit / cancel available",
              }))}
            />
            <WalletTransactions rows={data.walletTransactions.filter((row) => row.kind === "pledge")} />
          </PortalPanel>
        </div>
      )}
    </>
  );
}

function valuationMethod(stage: string) {
  if (stage === "live") return "income approach; Scenario C valuation basis";
  if (stage === "installing") return "replacement-cost estimate; Scenario C valuation basis";
  return "cost-basis estimate; Scenario C valuation basis";
}
