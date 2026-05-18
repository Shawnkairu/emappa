import { useRouter } from "expo-router";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import type { ProjectedBuilding } from "@emappa/shared";
import { PaletteCard, colors, officialPalette, spacing, typography } from "@emappa/ui";
import {
  APARTMENT_ATS_STATE_LABELS,
  LiveSupplyIndicator,
  type ApartmentAtsState,
} from "../shared/LiveSupplyIndicator";
import { SyntheticBadge } from "../shared";
import { ResidentPrimaryButton } from "./ResidentScaffold";
import { canResidentBuyTokens } from "./residentHomeState";
import {
  APARTMENT_ATS_STATE_COPY,
  APARTMENT_ATS_STATE_ORDER,
  atsStateIndex,
  deriveApartmentAtsState,
  deriveSupplySource,
} from "./residentAtsState";

type ResidentAtsDetailProps = {
  building: ProjectedBuilding;
  apartmentLabel?: string;
};

/** Scenario A §2.1 — per-apartment ATS machine with status, meaning, and next action. */
export function ResidentAtsDetail({ building, apartmentLabel = "Your apartment" }: ResidentAtsDetailProps) {
  const router = useRouter();
  const current = deriveApartmentAtsState(building);
  const supply = deriveSupplySource(building, current);
  const currentIdx = atsStateIndex(current);
  const copy = APARTMENT_ATS_STATE_COPY[current];
  const workflow = building.roleViews.resident.atsActivation;

  return (
    <View style={styles.wrap}>
      <SyntheticBadge
        label="Pilot ATS path · P1.6.6 API wires with apartment_label query"
        mode="projected"
        source="pilot"
      />
      <Text style={styles.unitLabel}>{apartmentLabel}</Text>
      <LiveSupplyIndicator atsState={current} supply={supply} />
      <PaletteCard style={styles.hero}>
        <Text style={styles.eyebrow}>Current state</Text>
        <Text style={styles.stateTitle}>{APARTMENT_ATS_STATE_LABELS[current]}</Text>
        <Text style={styles.meaning}>{copy.meaning}</Text>
        <Text style={styles.actionLead}>Next action</Text>
        <Text style={styles.action}>{copy.action}</Text>
        {workflow?.detail ? <Text style={styles.workflowDetail}>{workflow.detail}</Text> : null}
      </PaletteCard>
      <AtsNextActions building={building} state={current} />
      <Text style={styles.sectionTitle}>Activation path</Text>
      <Text style={styles.sectionLead}>
        Per-apartment ATS + PAYG meter mapping — not a common-bus model. KPLC fallback stays available until your unit is
        verified.
      </Text>
      {APARTMENT_ATS_STATE_ORDER.map((state, index) => (
        <AtsStateStep key={state} state={state} index={index} currentIdx={currentIdx} isSuspended={current === "suspended"} />
      ))}
      {current === "suspended" ? (
        <PaletteCard style={styles.suspendedCard}>
          <Text style={styles.suspendedTitle}>Suspended</Text>
          <Text style={styles.suspendedDetail}>{APARTMENT_ATS_STATE_COPY.suspended.meaning}</Text>
        </PaletteCard>
      ) : null}
      <ResidentPrimaryButton
        onPress={() => router.push("/(resident)/home")}
        accessibilityLabel="Return to resident home"
      >
        Back to home
      </ResidentPrimaryButton>
    </View>
  );
}

function AtsNextActions({ building, state }: { building: ProjectedBuilding; state: ApartmentAtsState }) {
  const router = useRouter();

  if (state === "activated" && canResidentBuyTokens(building)) {
    return (
      <ResidentPrimaryButton
        onPress={() => router.push("/(resident)/_embedded/token-purchase")}
        accessibilityLabel="Buy or top up tokens"
      >
        Buy / top up tokens
      </ResidentPrimaryButton>
    );
  }

  if (state === "not_mapped" || state === "capacity_cleared") {
    return (
      <ResidentPrimaryButton
        onPress={() => router.push("/(resident)/_embedded/load-profile-edit")}
        accessibilityLabel="Edit load profile"
      >
        Update load profile
      </ResidentPrimaryButton>
    );
  }

  if (state === "mapped_not_cleared") {
    return (
      <View style={styles.ctaRow}>
        <ResidentPrimaryButton
          onPress={() => router.push("/(resident)/_embedded/queue-detail")}
          accessibilityLabel="View capacity queue"
        >
          View queue
        </ResidentPrimaryButton>
        <ResidentPrimaryButton
          onPress={() => router.push("/(resident)/_embedded/pledge-detail")}
          accessibilityLabel="Manage pledge"
        >
          Manage pledge
        </ResidentPrimaryButton>
      </View>
    );
  }

  if (state === "ats_installed_unverified" || state === "suspended") {
    return (
      <ResidentPrimaryButton
        onPress={() => router.push("/(resident)/_embedded/alert-detail")}
        accessibilityLabel="View alerts and fallback status"
      >
        View alerts
      </ResidentPrimaryButton>
    );
  }

  return (
    <ResidentPrimaryButton
      onPress={() => router.push("/(resident)/_embedded/drs-detail")}
      accessibilityLabel="View deployment readiness"
    >
      View deployment readiness
    </ResidentPrimaryButton>
  );
}

function AtsStateStep({
  state,
  index,
  currentIdx,
  isSuspended,
}: {
  state: ApartmentAtsState;
  index: number;
  currentIdx: number;
  isSuspended: boolean;
}) {
  const done = !isSuspended && index < currentIdx;
  const active = !isSuspended && index === currentIdx;
  const copy = APARTMENT_ATS_STATE_COPY[state];
  const cardStyle = StyleSheet.flatten([
    styles.stepCard,
    active ? styles.stepCardActive : undefined,
    done ? styles.stepCardDone : undefined,
  ]) as ViewStyle;

  return (
    <PaletteCard style={cardStyle}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]} />
        <Text style={[styles.stepTitle, active && styles.stepTitleActive]}>{APARTMENT_ATS_STATE_LABELS[state]}</Text>
        {done ? <Text style={styles.stepBadge}>Done</Text> : null}
        {active ? <Text style={styles.stepBadgeCurrent}>Now</Text> : null}
      </View>
      <Text style={styles.stepMeaning}>{copy.meaning}</Text>
    </PaletteCard>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  unitLabel: { color: colors.muted, fontSize: typography.micro, fontWeight: "700", letterSpacing: 0.5 },
  hero: { gap: spacing.xs },
  eyebrow: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  stateTitle: { color: colors.text, fontSize: typography.title, fontWeight: "800" },
  meaning: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  actionLead: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },
  action: { color: colors.text, fontSize: typography.small, fontWeight: "700", lineHeight: 20 },
  workflowDetail: { color: colors.muted, fontSize: typography.micro, lineHeight: 17, marginTop: spacing.xs },
  sectionTitle: { color: colors.text, fontSize: typography.title, fontWeight: "800", marginTop: spacing.sm },
  sectionLead: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  stepCard: { gap: spacing.xs, opacity: 0.88 },
  stepCardActive: {
    borderColor: `${officialPalette.foxOrange}66`,
    backgroundColor: `${officialPalette.foxOrange}10`,
    opacity: 1,
  },
  stepCardDone: { opacity: 0.72 },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: "rgba(125, 87, 52, 0.2)",
  },
  stepDotDone: { backgroundColor: colors.green, borderColor: colors.green },
  stepDotActive: { backgroundColor: officialPalette.foxOrange, borderColor: officialPalette.foxOrange },
  stepTitle: { color: colors.text, fontSize: typography.small, fontWeight: "700", flex: 1 },
  stepTitleActive: { color: officialPalette.burntChestnut },
  stepBadge: {
    color: colors.green,
    fontSize: typography.micro,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  stepBadgeCurrent: {
    color: officialPalette.foxOrange,
    fontSize: typography.micro,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  stepMeaning: { color: colors.muted, fontSize: typography.micro, lineHeight: 17, paddingLeft: 18 },
  suspendedCard: {
    borderColor: `${colors.red}44`,
    backgroundColor: `${colors.red}0c`,
    gap: spacing.xs,
  },
  suspendedTitle: { color: colors.red, fontSize: typography.small, fontWeight: "800" },
  suspendedDetail: { color: colors.muted, fontSize: typography.small, lineHeight: 19 },
  ctaRow: { gap: spacing.sm },
});
