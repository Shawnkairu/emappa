import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PrepaidCommitment, ProjectedBuilding } from "@emappa/shared";
import { colors, spacing, typography } from "@emappa/ui";
import { useRouter } from "expo-router";
import { useApi } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";
import { OwnershipPositionCard, PilotBanner, ScreenState, TokenBalanceHero } from "../shared";
import { commitResidentPrepaid, getResidentPrepaidBalance, getResidentPrepaidHistory } from "./ResidentApi";
import { OwnershipMarketplaceCard } from "./OwnershipMarketplaceCard";
import { PledgeBalanceCard } from "./PledgeBalanceCard";
import { PledgeHistoryList } from "./PledgeHistoryList";
import { ResidentInfoCard, ResidentMetricGrid, ResidentPrimaryButton, ResidentScreenFrame } from "./ResidentScaffold";
import { TokenPurchaseCTA } from "./TokenPurchaseCTA";
import { canEditPledge, canResidentBuyTokens } from "./residentHomeState";
import { ROLE_TINT } from "./residentTint";
import { formatKes, formatPercent, residentView } from "./residentUtils";

type WalletSection = "pledges" | "tokens" | "ownership";

export function ResidentWalletScreen() {
  return (
    <ResidentScreenFrame
      section="Wallet"
      title="Wallet"
      subtitle="Pledges, token purchases, and ownership — separated tracks."
    >
      {(building, refetchHome) => <ResidentWalletPanels building={building} refetchHome={refetchHome} />}
    </ResidentScreenFrame>
  );
}

function ResidentWalletPanels({ building, refetchHome }: { building: ProjectedBuilding; refetchHome: () => void }) {
  const router = useRouter();
  const [section, setSection] = useState<WalletSection>("pledges");
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;
  const [pledgeError, setPledgeError] = useState<string | null>(null);
  const [pledgeStatus, setPledgeStatus] = useState<string | null>(null);
  const [isPledging, setIsPledging] = useState(false);
  const load = useCallback(async () => {
    const [balance, history] = await Promise.all([
      getResidentPrepaidBalance(apiRef.current, building.project.id),
      getResidentPrepaidHistory(apiRef.current, building.project.id),
    ]);
    return { balance, history };
  }, [building.project.id]);
  const { data, error, isLoading, refetch } = useApiData(load, [building.project.id]);
  const view = residentView(building);
  const fallbackBalanceKes = Math.round((building.project.prepaidCommittedKes ?? 0) / Math.max(1, building.project.units));
  const confirmedKes = data?.balance.confirmedTotalKes ?? fallbackBalanceKes;
  const history = data?.history ?? [];
  const pendingKes = history.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.amountKes, 0);
  const showBuyTokens = canResidentBuyTokens(building);
  const editPledge = canEditPledge(building);
  const hasShares = view.ownedProviderShare > 0;
  const phase = isLoading ? "loading" : error ? "error" : "populated";

  async function pledge() {
    if (!editPledge) return;
    setIsPledging(true);
    setPledgeError(null);
    setPledgeStatus(null);
    try {
      const result = await commitResidentPrepaid(apiRef.current, building.project.id, 1000);
      setPledgeStatus(`${formatKes(result.commitment.amountKes)} pledge ${result.commitment.status}.`);
      refetch();
      refetchHome();
    } catch (cause) {
      setPledgeError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsPledging(false);
    }
  }

  return (
    <>
      <PilotBanner compact />
      <WalletSegmentedControl section={section} onChange={setSection} />

      <ScreenState
        phase={phase}
        loadingMessage="Loading wallet…"
        errorTitle="Wallet unavailable"
        errorMessage={error?.message}
        onRetry={refetch}
      >
        {data ? (
          <>
            {section === "pledges" ? (
              <PledgesSection
                building={building}
                confirmedKes={confirmedKes}
                pendingKes={pendingKes}
                history={history}
                editPledge={editPledge}
                isPledging={isPledging}
                pledgeError={pledgeError}
                pledgeStatus={pledgeStatus}
                onPledge={pledge}
                onEdit={() => router.push("/(resident)/_embedded/pledge-detail")}
              />
            ) : null}

            {section === "tokens" ? (
              <TokensSection
                confirmedKes={confirmedKes}
                showBuyTokens={showBuyTokens}
                monthlySolarKwh={view.monthlySolarKwh}
              />
            ) : null}

            {section === "ownership" ? (
              <OwnershipSection
                building={building}
                hasShares={hasShares}
                sharePct={view.ownedProviderShare}
                onMarketplace={() => router.push("/(resident)/_embedded/marketplace")}
              />
            ) : null}
          </>
        ) : null}
      </ScreenState>
    </>
  );
}

function WalletSegmentedControl({
  section,
  onChange,
}: {
  section: WalletSection;
  onChange: (section: WalletSection) => void;
}) {
  const tabs: Array<{ id: WalletSection; label: string }> = [
    { id: "pledges", label: "Pledges" },
    { id: "tokens", label: "Tokens" },
    { id: "ownership", label: "Ownership" },
  ];

  return (
    <View style={styles.segmentRow}>
      {tabs.map((tab) => {
        const active = section === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PledgesSection({
  building,
  confirmedKes,
  pendingKes,
  history,
  editPledge,
  isPledging,
  pledgeError,
  pledgeStatus,
  onPledge,
  onEdit,
}: {
  building: ProjectedBuilding;
  confirmedKes: number;
  pendingKes: number;
  history: PrepaidCommitment[];
  editPledge: boolean;
  isPledging: boolean;
  pledgeError: string | null;
  pledgeStatus: string | null;
  onPledge: () => void;
  onEdit: () => void;
}) {
  const confirmedCount = history.filter((item) => item.status === "confirmed").length;
  const lastPledge = history[0];

  return (
    <>
      <PledgeBalanceCard
        amountKes={confirmedKes}
        canEdit={editPledge}
        onOpenWallet={() => {}}
        onEditPledge={editPledge ? onEdit : undefined}
      />

      <ResidentMetricGrid
        items={[
          {
            label: "Confirmed",
            value: formatKes(confirmedKes),
            detail: "Usable after capacity + ATS.",
            tone: confirmedKes > 0 ? "good" : "warn",
          },
          {
            label: "Pending",
            value: formatKes(pendingKes),
            detail: "Waiting to clear.",
            tone: pendingKes > 0 ? "warn" : "neutral",
          },
          {
            label: "Receipts",
            value: `${confirmedCount}`,
            detail: "Confirmed pledges.",
          },
          {
            label: "Last",
            value: lastPledge ? formatKes(lastPledge.amountKes) : "None",
            detail: lastPledge ? lastPledge.status : "No pledge yet.",
          },
        ]}
      />

      {editPledge ? (
        <ResidentInfoCard
          eyebrow="Pledge"
          title="Add KSh 1,000 toward your apartment path"
          detail="Pilot records intent only. Edit or cancel before activation per Scenario A §5."
        >
          <View style={{ gap: spacing.sm }}>
            <ResidentPrimaryButton
              onPress={onPledge}
              disabled={isPledging}
              accessibilityLabel={isPledging ? "Pledge in progress" : "Pledge one thousand Kenyan shillings"}
            >
              {isPledging ? "Pledging KSh 1,000…" : "Pledge KSh 1,000"}
            </ResidentPrimaryButton>
            {pledgeStatus ? <Text style={styles.success}>{pledgeStatus}</Text> : null}
            {pledgeError ? <Text style={styles.error}>{pledgeError}</Text> : null}
          </View>
        </ResidentInfoCard>
      ) : (
        <ResidentInfoCard
          eyebrow="Pledge locked"
          title="Pledges are locked post-activation"
          detail={`${building.project.name} is on the live path — use Tokens to top up after ATS verification.`}
        />
      )}

      <PledgeHistoryList
        history={history}
        onSelectPledge={() => onEdit()}
      />
    </>
  );
}

function TokensSection({
  confirmedKes,
  showBuyTokens,
  monthlySolarKwh,
}: {
  confirmedKes: number;
  showBuyTokens: boolean;
  monthlySolarKwh: number;
}) {
  const estimatedKwh = Math.round(monthlySolarKwh / 30);

  return (
    <>
      <TokenBalanceHero
        kesValue={formatKes(confirmedKes)}
        kwhValue={`${estimatedKwh} kWh`}
        disabled={!showBuyTokens}
        subtitle={
          showBuyTokens
            ? "Real-money top-ups apply after ATS verification. No guaranteed returns."
            : "Tokens activate once your apartment is capacity-cleared and ATS-verified."
        }
      />
      {showBuyTokens ? <TokenPurchaseCTA /> : (
        <Text style={styles.lockedCopy}>Buy tokens unlocks after activation — not available during A5 or pre-live states.</Text>
      )}
    </>
  );
}

function OwnershipSection({
  building,
  hasShares,
  sharePct,
  onMarketplace,
}: {
  building: ProjectedBuilding;
  hasShares: boolean;
  sharePct: number;
  onMarketplace: () => void;
}) {
  if (!hasShares) {
    return (
      <>
        <OwnershipMarketplaceCard building={building} onBrowse={onMarketplace} />
        <Text style={styles.emptyDetail}>You do not own shares yet. Browse only when project terms allow.</Text>
      </>
    );
  }

  return (
    <>
      <OwnershipMarketplaceCard building={building} onBrowse={onMarketplace} />
      <OwnershipPositionCard
      title="Provider pool share"
      sharePct={sharePct * 100}
      poolLabel="Retained claim"
      detail={`${formatPercent(sharePct)} of the provider-side pool on this building.`}
    />
    </>
  );
}

const styles = StyleSheet.create({
  segmentRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.lg,
    backgroundColor: ROLE_TINT.bg,
    borderRadius: 999,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 10,
  },
  segmentActive: { backgroundColor: colors.white },
  segmentText: { color: colors.muted, fontSize: typography.micro, fontWeight: "800", textTransform: "uppercase" },
  segmentTextActive: { color: colors.text },
  success: { color: colors.green, fontSize: typography.small, lineHeight: 19 },
  error: { color: colors.red, fontSize: typography.small, lineHeight: 19 },
  lockedCopy: { color: colors.muted, fontSize: typography.small, lineHeight: 20, marginTop: spacing.sm },
  emptyDetail: { color: colors.muted, fontSize: typography.small, lineHeight: 20, marginBottom: spacing.lg },
});
