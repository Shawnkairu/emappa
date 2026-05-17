import { useMemo, useState } from "react";
import { PortalKpiBar, PortalLedger, PortalPanel, PortalWorkflow } from "../../../components/PortalPrimitives";
import { PilotBanner, TokenBalanceHero, WalletTransactions, kes, kwh, pct } from "../../../portal/PortalWidgets";
import type { PortalScreenProps } from "../../../portal/types";

type WalletSegment = "pledges" | "tokens" | "ownership";

const segments: Array<{ id: WalletSegment; label: string }> = [
  { id: "pledges", label: "Pledges" },
  { id: "tokens", label: "Token purchases" },
  { id: "ownership", label: "Ownership" },
];

export default function ResidentWallet({ project, data }: PortalScreenProps) {
  const [activeSegment, setActiveSegment] = useState<WalletSegment>("pledges");
  const view = project.roleViews.resident;
  const pledgedTotal = data.prepaidBalance?.confirmed_total_kes ?? view.prepaidBalanceKes;
  const pledgeRows = data.prepaidHistory.length
    ? data.prepaidHistory
    : [{
        id: "pilot-pledge",
        buildingId: project.project.id,
        userId: "resident",
        amountKes: pledgedTotal,
        paymentMethod: "pledge" as const,
        status: pledgedTotal > 0 ? "confirmed" as const : "pending" as const,
        createdAt: new Date().toISOString(),
        confirmedAt: pledgedTotal > 0 ? new Date().toISOString() : null,
      }];
  const earnings = project.providerPayouts
    .filter((payout) => payout.ownerRole === "resident")
    .reduce((sum, payout) => sum + payout.payout, 0);
  const hasShares = view.ownedProviderShare > 0;
  const projectedValue = hasShares ? earnings * 24 : 0;
  const isActivated = project.project.stage === "live" || view.capacityQueue.status === "activated";
  const tokenBalanceKes = data.walletBalance?.kes ?? (isActivated ? pledgedTotal : 0);
  const tokenBalanceKwh = isActivated ? view.monthlySolarKwh : 0;
  const tokenRows = useMemo(
    () => data.walletTransactions.filter((row) => row.kind !== "pledge"),
    [data.walletTransactions],
  );
  const ownershipMethod = project.project.stage === "live" ? "income approach" : "replacement-cost estimate";

  return (
    <>
      <PilotBanner>Resident wallet: pledges are non-binding before activation; token purchases only appear after the apartment is live.</PilotBanner>
      <PortalKpiBar items={[
        { label: "Pledged total", value: kes(pledgedTotal), detail: "confirmed pilot pledges" },
        { label: "Share earnings", value: kes(hasShares ? earnings : 0), detail: "monetized solar only" },
        { label: "Net savings", value: kes(view.savingsKes), detail: "avoided grid cost" },
      ]} />

      <PortalPanel eyebrow="Wallet sections" title="Pledges, tokens, and ownership stay separate">
        <div className="portal-tabbar" role="tablist" aria-label="Resident wallet sections">
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
        <PortalWorkflow
          steps={[
            { label: "Pledge", detail: "Pre-activation demand signal; no money is charged in pilot mode.", status: isActivated ? "archived after live" : "editable" },
            { label: "Token purchase", detail: "Real top-up flow is hidden until apartment activation and capacity clearance.", status: isActivated ? "live" : "locked" },
            { label: "Ownership", detail: "Share payouts come only from monetized solar, never from pledge balance.", status: hasShares ? pct(view.ownedProviderShare) : "no shares" },
          ]}
        />
      </PortalPanel>

      {activeSegment === "pledges" && (
        <div className="portal-two-col">
          <PortalPanel eyebrow="Pledges" title="Non-binding pledge balance">
            <PortalLedger rows={[
              { label: "Pledge total", value: kes(pledgedTotal), note: "confirmed resident pledge" },
              { label: "Edit / cancel", value: isActivated ? "Closed" : "Available", note: isActivated ? "tokens are live" : "pre-activation only" },
              { label: "Pilot disclosure", value: "No charge", note: "no money charged in pilot" },
            ]} />
          </PortalPanel>
          <PortalPanel eyebrow="History" title="Chronological pledge rows">
            <PortalLedger
              rows={pledgeRows.map((pledge) => ({
                label: new Date(pledge.createdAt).toLocaleDateString(),
                value: kes(pledge.amountKes),
                note: pledgeStatus(pledge.status),
                status: isActivated ? "archived" : "editable",
              }))}
            />
          </PortalPanel>
        </div>
      )}

      {activeSegment === "tokens" && (
        <div className="portal-two-col">
          <TokenBalanceHero project={project} title="Resident token balance" disabled={!isActivated} />
          <PortalPanel eyebrow="Token purchases" title={isActivated ? "Consumption ledger" : "Available after activation"}>
            <PortalLedger rows={[
              { label: "Token balance", value: isActivated ? kes(tokenBalanceKes) : "Locked", note: isActivated ? kwh(tokenBalanceKwh) : "apartment not activated" },
              { label: "Top up / buy", value: isActivated ? "Available" : "Hidden", note: "live apartments only" },
              { label: "Refund / rollover", value: "Applied at settlement", note: "when applicable" },
            ]} />
            {isActivated ? (
              <WalletTransactions rows={tokenRows} />
            ) : (
              <p className="portal-note">Buy tokens is intentionally hidden before activation so pledge and purchase states never overlap.</p>
            )}
          </PortalPanel>
        </div>
      )}

      {activeSegment === "ownership" && (
        <div className="portal-two-col">
          <PortalPanel eyebrow="Ownership" title={hasShares ? "Resident ownership position" : "You don't own shares yet"}>
            <PortalLedger rows={[
              { label: "Array / asset", value: project.project.name, note: project.project.locationBand },
              { label: "Ownership", value: hasShares ? pct(view.ownedProviderShare) : "0%", note: hasShares ? "generation visible" : "generation visibility gate" },
              { label: "Current valuation", value: hasShares ? kes(projectedValue) : "—", note: `${ownershipMethod}; Scenario A §8.3` },
              { label: "Share price", value: hasShares ? kes(projectedValue * view.ownedProviderShare) : "Marketplace", note: "per available unit when listed" },
              { label: "Projected payouts", value: hasShares ? kes(earnings) : "—", note: project.project.stage === "live" ? "actual monetized solar" : "conservative range after live" },
            ]} />
          </PortalPanel>
          <PortalPanel eyebrow="Marketplace" title={hasShares ? "Asset detail" : "Browse buyable shares"}>
            <PortalWorkflow
              steps={[
                { label: hasShares ? "Open asset detail" : "Open marketplace", detail: hasShares ? "Review valuation, share split, and payout basis." : "See risk disclosures and available shares before any purchase.", status: hasShares ? "available" : "empty state" },
                { label: "Valuation basis", detail: "Cost basis, replacement-cost, or income approach is cited before any buy/sell action.", status: "required" },
                { label: "Settlement rule", detail: "Ownership earnings are paid only from monetized solar.", status: "Scenario A §8.5" },
              ]}
            />
          </PortalPanel>
        </div>
      )}
    </>
  );
}

function pledgeStatus(status: "pending" | "confirmed" | "failed") {
  if (status === "confirmed") return "active";
  if (status === "failed") return "archived";
  return "active";
}
