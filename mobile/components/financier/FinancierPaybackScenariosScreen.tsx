import { PaybackCard } from "../PaybackCard";
import {
  CashflowWaterfallCard,
  FinancierBriefCard,
  FinancierDiligenceCard,
  FinancierMilestoneBriefCard,
  FinancierScreenShell,
  GateRailCard,
  RecoveryBandCard,
  formatKesShort,
} from "./FinancierShared";

function scenarioMonths(baseMonths: number, factor: number) {
  if (!Number.isFinite(baseMonths) || baseMonths <= 0) return "—";
  return `${Math.round(baseMonths * factor)} mo`;
}

export function FinancierPaybackScenariosScreen() {
  return (
    <FinancierScreenShell
      section="Payback"
      title="Scenarios & release"
      subtitle="Downside, base, and upside payback — plus milestone tranche gates before capital moves."
      actions={["Downside", "Base", "Release"]}
      hero={({ primary }) => {
        const payback = primary.financierPayback;
        if (payback.notCurrentlyRecovering) {
          return {
            label: "Principal recovery",
            value: "Not yet",
            sub: "Usage-linked recovery starts after LBRS go-live and monetized kWh.",
            tone: "warn" as const,
          };
        }
        return {
          label: "Base-case principal",
          value: `${payback.principalMonths} mo`,
          sub: `${payback.yearsToPrincipal.toFixed(1)} years at current monetized pool — not guaranteed.`,
          tone: "neutral" as const,
        };
      }}
    >
      {({ primary }) => {
        const payback = primary.financierPayback;
        const baseMonths = payback.principalMonths;

        return (
          <>
            <PaybackCard payback={payback} />
            <RecoveryBandCard building={primary} title="Monthly recovery range" />
            <FinancierBriefCard
              eyebrow="Scenarios"
              title="What moves payback"
              body="Ranges only. Utilization, downtime, reserves, and fees shift recovery — never a single guaranteed date."
              rows={
                payback.notCurrentlyRecovering
                  ? [
                      { label: "Downside", value: "Blocked", note: "Pre-live or zero monetized pool.", tone: "warn" },
                      { label: "Base", value: "Blocked", note: "Awaiting measured settlement.", tone: "warn" },
                      { label: "Upside", value: "Blocked", note: "Scenarios unlock post go-live.", tone: "neutral" },
                    ]
                  : [
                      {
                        label: "Downside",
                        value: scenarioMonths(baseMonths, 1.35),
                        note: "Lower utilization and higher downtime.",
                        tone: "warn",
                      },
                      {
                        label: "Base",
                        value: scenarioMonths(baseMonths, 1),
                        note: `${formatKesShort(primary.roleViews.financier.monthlyRecoveryKes)}/mo at current sold kWh.`,
                        tone: "good",
                      },
                      {
                        label: "Upside",
                        value: scenarioMonths(baseMonths, 0.78),
                        note: "Higher utilization within prepaid envelope.",
                        tone: "good",
                      },
                    ]
              }
            />
            <FinancierMilestoneBriefCard building={primary} />
            <GateRailCard building={primary} />
            <FinancierDiligenceCard building={primary} />
            <CashflowWaterfallCard building={primary} />
          </>
        );
      }}
    </FinancierScreenShell>
  );
}
