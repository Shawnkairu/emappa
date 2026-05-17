import { useEffect, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View, type DimensionValue } from "react-native";
import { getRoleHome } from "@emappa/api-client";
import type { DeploymentDecision, ProjectedBuilding } from "@emappa/shared";
import {
  AppMark,
  GlassCard,
  Label,
  PaletteCard,
  Pill,
  Surface,
  colors,
  officialPalette,
  radius,
  shadows,
  spacing,
  typography,
} from "@emappa/ui";
import { BuildingPulse, KillSwitchBanner, ProposedFlowRibbon } from "../design-handoff";

export type BuildingOwnerTone = "good" | "warn" | "bad" | "neutral";

export interface BuildingOwnerHero {
  label: string;
  value: string;
  sub: string;
  tone?: BuildingOwnerTone;
  status?: string;
}

export function BuildingOwnerScreenShell({
  section,
  title,
  subtitle,
  actions,
  hero,
  children,
  showHandoffRibbon = false,
}: {
  section: string;
  title: string;
  subtitle: string;
  actions: string[];
  hero: (building: ProjectedBuilding) => BuildingOwnerHero;
  children: (building: ProjectedBuilding) => ReactNode;
  /** Design-handoff proposed-flow ribbon (amber wireframe banner). */
  showHandoffRibbon?: boolean;
}) {
  const [building, setBuilding] = useState<ProjectedBuilding | null>(null);
  const [activity, setActivity] = useState<string[]>([]);

  useEffect(() => {
    getRoleHome("building_owner").then((home) => {
      setBuilding(home.primary);
      setActivity(home.activity);
    });
  }, []);

  if (!building) {
    return (
      <Surface>
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}>
          <AppMark size={52} />
          <Text
            style={{
              color: colors.text,
              fontSize: typography.title,
              fontWeight: "600",
              letterSpacing: -0.45,
              marginTop: 18,
              lineHeight: typography.title + 6,
            }}
          >
            Preparing owner command
          </Text>
          <Text style={{ color: colors.muted, fontSize: typography.small, marginTop: 8, lineHeight: 20 }}>
            Loading building readiness...
          </Text>
        </View>
      </Surface>
    );
  }

  const heroMetric = hero(building);

  return (
    <Surface>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: spacing.xxl + 8,
          flexGrow: 1,
          backgroundColor: colors.sky,
        }}
      >
        {showHandoffRibbon ? <ProposedFlowRibbon /> : null}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: showHandoffRibbon ? spacing.sm + 4 : 22,
          }}
        >
          <View>
            <Text
              style={{
                color: officialPalette.deepWood,
                fontSize: typography.micro,
                fontWeight: "800",
                letterSpacing: 0.75,
                textTransform: "uppercase",
              }}
            >
              {section}
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: typography.micro,
                fontWeight: "700",
                letterSpacing: 0.65,
                marginTop: 8,
                textTransform: "uppercase",
              }}
            >
              Owner workspace
            </Text>
          </View>
          <AppMark />
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.hero + 3,
            fontWeight: "800",
            letterSpacing: -1,
            lineHeight: typography.hero + 9,
            marginTop: 12,
          }}
        >
          {title}
        </Text>
        <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 19, marginTop: 8, marginBottom: spacing.lg, maxWidth: 320 }}>
          {subtitle}
        </Text>

        <BuildingOwnerActionRail actions={actions} />
        <BuildingOwnerHeroCard hero={heroMetric} />
        <BuildingPulse role="building_owner" building={building} />
        <KillSwitchBanner building={building} />
        {children(building)}
        <BuildingOwnerActivityCard activity={activity} />
      </ScrollView>
    </Surface>
  );
}

/** Section opener inside a GlassCard (matches resident scaffold card typography). */
export function BuildingOwnerIntroCard({
  eyebrow,
  title,
  detail,
  children,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  children?: ReactNode;
}) {
  return (
    <GlassCard>
      <Label>{eyebrow}</Label>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.heading,
          fontWeight: "600",
          letterSpacing: -0.35,
          marginTop: 5,
          lineHeight: typography.heading + 4,
        }}
      >
        {title}
      </Text>
      {detail ? (
        <Text style={{ color: colors.muted, fontSize: typography.micro, lineHeight: 17, marginTop: 6 }}>{detail}</Text>
      ) : null}
      {children ? <View style={{ marginTop: spacing.md }}>{children}</View> : null}
    </GlassCard>
  );
}

/** Profile/header card aligned with resident `ResidentProfileScreen` trust card pattern. */
export function BuildingOwnerProfileCard({ building }: { building: ProjectedBuilding }) {
  const view = building.roleViews.owner;
  const letter = (building.project.name.trim().slice(0, 1) || "?").toUpperCase();
  const sessionReady = building.drs.decision === "deployment_ready";

  return (
    <PaletteCard
      borderRadius={34}
      padding={20}
      style={{ ...profileStyles.surface, backgroundColor: `${officialPalette.furCream}F0` }}
    >
      <View style={profileStyles.profileRow}>
        <View style={profileStyles.avatar}>
          <Text style={profileStyles.avatarText}>{letter}</Text>
          <View style={profileStyles.badge}>
            <Text style={profileStyles.badgeText}>O</Text>
          </View>
        </View>
        <View style={profileStyles.profileStats}>
          <BuildingOwnerProfileStat value={String(building.project.units)} label="Units" />
          <BuildingOwnerProfileStat value={stageLabel(building.project.stage)} label="Stage" />
          <BuildingOwnerProfileStat value={sessionReady ? "Clear" : "Review"} label="DRS" />
        </View>
      </View>
      <Text style={profileStyles.name}>{building.project.name}</Text>
      <Text style={profileStyles.location}>{building.project.locationBand}</Text>
      <Text style={{ color: colors.muted, fontSize: typography.micro, lineHeight: 16, marginTop: 12 }}>
        {formatPercent(view.residentParticipation)} resident participation · {view.prepaidMonthsCovered} prepaid month(s) covered.
      </Text>
      <View style={[profileStyles.insetWell, { marginTop: spacing.md }]}>
        <Text style={{ color: colors.text, fontSize: typography.small, fontWeight: "600" }}>Privacy boundary</Text>
        <Text style={{ color: colors.muted, fontSize: typography.micro, lineHeight: 16, marginTop: 5 }}>
          {building.transparency?.privacyNote ?? "Owner views show building-level signals only."}
        </Text>
      </View>
    </PaletteCard>
  );
}

export function BuildingOwnerMetricGrid({
  metrics,
}: {
  metrics: Array<{ label: string; value: string; detail?: string; tone?: BuildingOwnerTone }>;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
      {metrics.map((metric) => (
        <PaletteCard key={metric.label} borderRadius={radius.lg - 2} padding={14} style={{ width: "48%", minHeight: 118 }}>
          <View
            style={{
              height: 2,
              alignSelf: "stretch",
              borderRadius: 2,
              backgroundColor: `${officialPalette.toastedClay}44`,
              marginBottom: 10,
            }}
          />
          <Pill tone={metric.tone ?? "neutral"}>{metric.label}</Pill>
          <Text style={{ color: colors.text, fontSize: 21, fontWeight: "600", letterSpacing: -0.6, marginTop: 12 }}>
            {metric.value}
          </Text>
          {metric.detail ? (
            <Text style={{ color: colors.muted, fontSize: typography.small - 1, lineHeight: 17, marginTop: 6 }}>{metric.detail}</Text>
          ) : null}
        </PaletteCard>
      ))}
    </View>
  );
}

export function BuildingOwnerBriefCard({
  eyebrow,
  title,
  body,
  rows,
}: {
  eyebrow: string;
  title: string;
  body: string;
  rows: Array<{ label: string; value: string; note: string; tone?: BuildingOwnerTone }>;
}) {
  return (
    <GlassCard>
      <Label>{eyebrow}</Label>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.heading,
          fontWeight: "600",
          letterSpacing: -0.35,
          marginTop: 5,
          lineHeight: typography.heading + 4,
        }}
      >
        {title}
      </Text>
      <Text style={{ color: colors.muted, fontSize: typography.micro, lineHeight: 17, marginTop: 6 }}>{body}</Text>
      <View
        style={{
          marginTop: spacing.md,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          overflow: "hidden",
        }}
      >
        {rows.map((row, index) => (
          <View
            key={`${row.label}-${row.value}`}
            style={{
              padding: 10,
              backgroundColor: index % 2 === 0 ? colors.white : colors.sky,
              borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: typography.micro - 1,
                  fontWeight: "700",
                  letterSpacing: 0.65,
                  textTransform: "uppercase",
                  flex: 1,
                }}
              >
                {row.label}
              </Text>
              <Text style={{ color: briefToneFg(row.tone), fontSize: typography.small - 1, fontWeight: "600" }}>{row.value}</Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: typography.micro, lineHeight: 16, marginTop: 4 }}>{row.note}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export function BuildingOwnerWorkflowCard({
  title,
  items,
  eyebrow = "Owner workflow",
}: {
  title: string;
  items: Array<{ label: string; detail: string; status: string; tone?: BuildingOwnerTone }>;
  eyebrow?: string;
}) {
  return (
    <GlassCard>
      <Label>{eyebrow}</Label>
      <Text style={{ color: colors.text, fontSize: typography.title, fontWeight: "600", letterSpacing: -0.5, marginTop: 6 }}>
        {title}
      </Text>
      <View style={{ marginTop: 12 }}>
        {items.map((item, index) => (
          <View
            key={item.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 12,
              borderTopColor: index === 0 ? "transparent" : colors.border,
              borderTopWidth: 1,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "600", fontSize: typography.small }}>{item.label}</Text>
              <Text style={{ color: colors.muted, fontSize: typography.micro, lineHeight: 16, marginTop: 3 }}>{item.detail}</Text>
            </View>
            <Pill tone={item.tone ?? "neutral"}>{item.status}</Pill>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export function BuildingOwnerProgressCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number; detail: string; tone?: BuildingOwnerTone }>;
}) {
  return (
    <GlassCard>
      <Label>Readiness inputs</Label>
      <Text style={{ color: colors.text, fontSize: typography.title, fontWeight: "600", letterSpacing: -0.5, marginTop: 6 }}>
        {title}
      </Text>
      <View style={{ marginTop: 14 }}>
        {rows.map((row) => (
          <View key={row.label} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>{row.label}</Text>
              <Text style={{ color: toneColor(row.tone), fontWeight: "600" }}>{Math.round(row.value)}%</Text>
            </View>
            <View style={{ height: 9, borderRadius: 999, backgroundColor: colors.panelSoft, marginTop: 8 }}>
              <View
                style={{
                  height: 9,
                  width: `${Math.max(0, Math.min(100, row.value))}%` as DimensionValue,
                  borderRadius: 999,
                  backgroundColor: toneColor(row.tone),
                }}
              />
            </View>
            <Text style={{ color: colors.muted, fontSize: typography.small - 1, lineHeight: 17, marginTop: 5 }}>{row.detail}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export function BuildingOwnerRoyaltyCard({
  royaltyKes,
  benchmarkKes,
  monetizedKwh,
  utilization,
  wasteKwh,
}: {
  royaltyKes: number;
  benchmarkKes: number;
  monetizedKwh?: number;
  utilization?: number;
  wasteKwh?: number;
}) {
  const benchmarkDelta = benchmarkKes > 0 ? royaltyKes / benchmarkKes - 1 : 0;

  return (
    <GlassCard>
      <Label>Projected monthly royalty</Label>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginTop: 10 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.hero + 6,
              fontWeight: "600",
              letterSpacing: -1.2,
              lineHeight: typography.hero + 14,
            }}
          >
            {formatKes(royaltyKes)}
          </Text>
          <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 20, marginTop: 6 }}>
            Paid only from prepaid solar that is sold and settled.
          </Text>
        </View>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 999,
            backgroundColor: `${officialPalette.guitarMaple}24`,
            borderColor: `${officialPalette.softCinnamon}55`,
            borderWidth: 1,
            alignItems: "center",
            justifyContent: "center",
            ...shadows.soft,
          }}
        >
          <Text style={{ color: benchmarkDelta >= 0 ? colors.green : colors.red, fontSize: 20, fontWeight: "600", letterSpacing: -0.4 }}>
            {benchmarkDelta >= 0 ? "+" : ""}{Math.round(benchmarkDelta * 100)}%
          </Text>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" }}>vs median</Text>
        </View>
      </View>
      <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 22, marginTop: 8 }}>
        Generated-but-unused, curtailed, or free-exported energy is excluded from owner payout.
      </Text>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <RoyaltyStat label="Median" value={formatKes(benchmarkKes)} />
        <RoyaltyStat label="Sold kWh" value={monetizedKwh === undefined ? "settled" : Math.round(monetizedKwh).toLocaleString()} />
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <RoyaltyStat label="Utilization" value={utilization === undefined ? "projected" : formatPercent(utilization)} tone={utilization !== undefined && utilization >= 0.75 ? "good" : "warn"} />
        <RoyaltyStat label="Waste" value={wasteKwh === undefined ? "excluded" : `${Math.round(wasteKwh).toLocaleString()} kWh`} tone={wasteKwh && wasteKwh > 0 ? "warn" : "neutral"} />
      </View>
    </GlassCard>
  );
}

export function BuildingOwnerCommandCard({ building }: { building: ProjectedBuilding }) {
  const view = building.roleViews.owner;
  const readyGates = view.gates.filter((gate) => gate.complete).length;

  return (
    <GlassCard>
      <Label>Building command snapshot</Label>
      <Text style={{ color: colors.text, fontSize: typography.heading + 4, fontWeight: "600", letterSpacing: -0.4, marginTop: 6 }}>
        {building.project.name}
      </Text>
      <Text style={{ color: colors.muted, fontSize: typography.body, lineHeight: 22, marginTop: 8 }}>
        {building.project.units} units in {building.project.locationBand}. Owner decisions focus on access, resident trust, and the next deployment handoff.
      </Text>
      <View
        style={{
          backgroundColor: `${officialPalette.furCream}2A`,
          borderColor: `${officialPalette.plushCaramel}45`,
          borderWidth: 1,
          borderRadius: 24,
          padding: 14,
          marginTop: 18,
          ...shadows.soft,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600", letterSpacing: 0.7, textTransform: "uppercase" }}>Current lane</Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: "600", letterSpacing: -0.7, marginTop: 6 }}>
              {stageLabel(building.project.stage)}
            </Text>
          </View>
          <Pill tone={decisionTone(building.drs.decision)}>{building.drs.decision}</Pill>
        </View>
        <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.panelSoft, marginTop: 16 }}>
          <View
            style={{
              width: `${Math.min(100, view.residentParticipation * 100)}%` as DimensionValue,
              height: 8,
              borderRadius: 999,
              backgroundColor: view.residentParticipation >= 0.8 ? colors.green : colors.amber,
            }}
          />
        </View>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 }}>
          {formatPercent(view.residentParticipation)} resident participation, {view.prepaidMonthsCovered} prepaid month(s) covered.
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <SnapshotStat label="Gates" value={`${readyGates}/${view.gates.length}`} tone={readyGates === view.gates.length ? "good" : "warn"} />
        <SnapshotStat label="Royalty" value={formatKes(view.monthlyRoyaltyKes)} tone="neutral" />
      </View>
    </GlassCard>
  );
}

export function BuildingOwnerScoreArtifact({
  score,
  label,
  decision,
  components,
  blockers,
}: {
  score: number;
  label: string;
  decision: DeploymentDecision;
  components: ProjectedBuilding["drs"]["components"];
  blockers: string[];
}) {
  const tone = decisionTone(decision);
  const componentRows = [
    { label: "Demand", value: components.demandCoverage, tone: components.demandCoverage >= 60 ? "good" : "bad" },
    { label: "Prepaid", value: components.prepaidCommitment, tone: components.prepaidCommitment > 0 ? "good" : "bad" },
    { label: "Load", value: components.loadProfile, tone: components.loadProfile >= 65 ? "good" : "warn" },
    { label: "Install", value: components.installationReadiness, tone: components.installationReadiness >= 65 ? "good" : "warn" },
    { label: "Electrician", value: components.electricianReadiness, tone: components.electricianReadiness >= 65 ? "good" : "warn" },
    { label: "Capital", value: components.capitalAlignment, tone: components.capitalAlignment >= 65 ? "good" : "warn" },
  ] as const;

  return (
    <GlassCard>
      <View style={{ alignItems: "center", paddingVertical: 4 }}>
        <View
          style={{
            height: 170,
            width: 170,
            borderRadius: 999,
            borderColor: `${officialPalette.deepWood}33`,
            borderWidth: 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${officialPalette.furCream}2E`,
            ...shadows.soft,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 44, fontWeight: "600", letterSpacing: -1.8 }}>{score}</Text>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" }}>/ 100 DRS</Text>
        </View>
        <Pill tone={tone}>{decision}</Pill>
        <Text style={{ color: colors.text, fontSize: 19, fontWeight: "600", letterSpacing: -0.3, marginTop: 12 }}>{label}</Text>
        <Text style={{ color: colors.muted, lineHeight: 21, marginTop: 6, textAlign: "center" }}>
          DRS gates capital release, provider lock, electrician scheduling, and go-live.
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
        {componentRows.map((row) => (
          <View
            key={row.label}
            style={{
              width: "31%",
              backgroundColor: `${officialPalette.scarfOat}18`,
              borderColor: `${officialPalette.toastedClay}38`,
              borderWidth: 1,
              borderRadius: 18,
              padding: 10,
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" }}>{row.label}</Text>
            <Text style={{ color: toneColor(row.tone), fontSize: 18, fontWeight: "600", letterSpacing: -0.4, marginTop: 6 }}>{Math.round(row.value)}%</Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 16 }}>
        {(blockers.length > 0 ? blockers : ["No active kill switches returned."]).slice(0, 3).map((blocker) => (
          <View key={blocker} style={{ backgroundColor: blockers.length > 0 ? `${colors.red}10` : `${colors.green}10`, borderColor: blockers.length > 0 ? `${colors.red}30` : `${colors.green}30`, borderWidth: 1, borderRadius: 16, padding: 10, marginTop: 8 }}>
            <Text style={{ color: blockers.length > 0 ? colors.red : colors.green, fontWeight: "600" }}>{blocker}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export function BuildingOwnerGateCard({
  gates,
  title = "Readiness gates",
}: {
  gates: Array<{ label: string; complete: boolean }>;
  title?: string;
}) {
  const completeCount = gates.filter((gate) => gate.complete).length;

  return (
    <GlassCard>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <View>
          <Label>Gate register</Label>
          <Text style={{ color: colors.text, fontSize: typography.title, fontWeight: "600", letterSpacing: -0.5, marginTop: 6 }}>{title}</Text>
        </View>
        <Pill tone={completeCount === gates.length ? "good" : "warn"}>{completeCount}/{gates.length}</Pill>
      </View>
      <View style={{ marginTop: 14 }}>
        {gates.map((gate, index) => (
          <View
            key={gate.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 11,
              borderTopColor: index === 0 ? "transparent" : colors.border,
              borderTopWidth: 1,
            }}
          >
            <View style={{ height: 22, width: 22, borderRadius: 999, backgroundColor: gate.complete ? `${colors.green}16` : `${colors.red}12`, borderColor: gate.complete ? colors.green : colors.red, borderWidth: 1, alignItems: "center", justifyContent: "center" }}>
              <View style={{ height: 8, width: 8, borderRadius: 999, backgroundColor: gate.complete ? colors.green : colors.red }} />
            </View>
            <Text style={{ color: colors.text, flex: 1, fontWeight: "600" }}>{gate.label}</Text>
            <Text style={{ color: gate.complete ? colors.green : colors.red, fontSize: 12, fontWeight: "600" }}>{gate.complete ? "Ready" : "Blocked"}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export function BuildingOwnerJourneyCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; detail: string; status: string; tone?: BuildingOwnerTone }>;
}) {
  return (
    <GlassCard>
      <Label>Deployment journey</Label>
      <Text style={{ color: colors.text, fontSize: typography.title, fontWeight: "600", letterSpacing: -0.5, marginTop: 6 }}>{title}</Text>
      <View style={{ marginTop: 16 }}>
        {items.map((item, index) => (
          <View key={item.label} style={{ flexDirection: "row", gap: 12, paddingBottom: index === items.length - 1 ? 0 : 18 }}>
            <View style={{ alignItems: "center" }}>
              <View style={{ height: 28, width: 28, borderRadius: 999, borderColor: toneColor(item.tone), borderWidth: 1, backgroundColor: `${toneColor(item.tone)}14`, alignItems: "center", justifyContent: "center" }}>
                <View style={{ height: 8, width: 8, borderRadius: 999, backgroundColor: toneColor(item.tone) }} />
              </View>
              {index < items.length - 1 ? <View style={{ flex: 1, width: 1, backgroundColor: colors.border, marginTop: 6 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <Text style={{ color: colors.text, flex: 1, fontWeight: "600" }}>{item.label}</Text>
                <Pill tone={item.tone ?? "neutral"}>{item.status}</Pill>
              </View>
              <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 19, marginTop: 5 }}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export function decisionTone(decision: DeploymentDecision): BuildingOwnerTone {
  return decision === "deployment_ready" ? "good" : decision === "review" ? "warn" : "bad";
}

export function formatKes(value: number) {
  return `KSh ${Math.round(value).toLocaleString()}`;
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function stageLabel(stage: string) {
  return stage
    .replace(/_/g, " ")
    .split(" ")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

/** Dashed placeholder for proposed-flow surfaces (design-handoff wireframe). */
export function BuildingOwnerWireframeWell({ height = 120, label }: { height?: number; label: string }) {
  return (
    <View
      style={{
        height,
        borderRadius: 14,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.borderStrong,
        backgroundColor: colors.sky,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
        paddingHorizontal: 12,
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontSize: 10.5,
          fontWeight: "600",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function BuildingOwnerHeroCard({ hero }: { hero: BuildingOwnerHero }) {
  return (
    <PaletteCard
      borderRadius={radius.xl}
      padding={22}
      style={{
        marginBottom: spacing.lg + 2,
        borderColor: `${officialPalette.deepWood}26`,
        ...shadows.card,
      }}
      contentStyle={{
        borderLeftWidth: 3,
        borderLeftColor: `${officialPalette.foxOrange}55`,
        paddingLeft: 19,
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontSize: typography.micro,
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: 0.65,
        }}
      >
        {hero.label}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.hero + 10,
          fontWeight: "600",
          letterSpacing: -1.5,
          marginTop: 10,
          lineHeight: typography.hero + 18,
        }}
      >
        {hero.value}
      </Text>
      <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 21, marginTop: 6 }}>{hero.sub}</Text>
      <View style={{ marginTop: spacing.sm }}>
        <Pill tone={hero.tone ?? "neutral"}>{hero.status ?? hero.tone ?? "owner"}</Pill>
      </View>
    </PaletteCard>
  );
}

function BuildingOwnerActionRail({ actions }: { actions: string[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
      {actions.map((action, index) => (
        <View
          key={action}
          accessibilityRole="text"
          accessibilityLabel={action}
          style={{
            borderRadius: radius.pill,
            backgroundColor: colors.panel,
            borderColor: index === 0 ? colors.orangeDeep : colors.border,
            borderWidth: 1,
            paddingHorizontal: 14,
            paddingVertical: 9,
            marginRight: 8,
          }}
        >
          <Text style={{ color: index === 0 ? colors.orangeDeep : colors.text, fontSize: 12, fontWeight: "600" }}>{action}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function BuildingOwnerActivityCard({ activity }: { activity: string[] }) {
  return (
    <GlassCard>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ color: colors.text, fontSize: typography.heading + 1, fontWeight: "600", letterSpacing: -0.3 }}>
          Owner activity
        </Text>
        <Pill tone="neutral">latest</Pill>
      </View>
      {activity.map((item, index) => (
        <View
          key={item}
          style={{
            flexDirection: "row",
            gap: 10,
            paddingVertical: 12,
            borderTopColor: index === 0 ? "transparent" : colors.border,
            borderTopWidth: 1,
          }}
        >
          <View
            style={{
              height: 8,
              width: 8,
              borderRadius: 999,
              marginTop: 6,
              backgroundColor: `${officialPalette.furCream}55`,
              borderWidth: 1,
              borderColor: `${officialPalette.plushCaramel}50`,
            }}
          />
          <Text style={{ color: colors.muted, flex: 1, fontSize: typography.small, lineHeight: 20 }}>{item}</Text>
        </View>
      ))}
    </GlassCard>
  );
}

function SnapshotStat({ label, value, tone }: { label: string; value: string; tone: BuildingOwnerTone }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: `${officialPalette.guitarMaple}16`,
        borderColor: `${officialPalette.warmUmbar}2E`,
        borderWidth: 1,
        borderRadius: 18,
        padding: 12,
        ...shadows.soft,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ color: toneColor(tone), fontSize: 17, fontWeight: "600", letterSpacing: -0.3, marginTop: 6 }}>{value}</Text>
    </View>
  );
}

function RoyaltyStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: BuildingOwnerTone }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: `${officialPalette.furCream}1C`,
        borderColor: `${officialPalette.plushCaramel}3A`,
        borderWidth: 1,
        borderRadius: 18,
        padding: 11,
        ...shadows.soft,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ color: tone === "neutral" ? colors.text : toneColor(tone), fontSize: 14, fontWeight: "600", marginTop: 6 }}>{value}</Text>
    </View>
  );
}

function BuildingOwnerProfileStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={profileStyles.stat}>
      <Text style={profileStyles.statValue}>{value}</Text>
      <Text style={profileStyles.statLabel}>{label}</Text>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  surface: {
    marginBottom: spacing.lg,
  },
  profileRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: officialPalette.furCream,
    borderColor: "rgba(118, 73, 39, 0.12)",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
    height: 108,
    justifyContent: "center",
    width: 108,
  },
  avatarText: {
    color: officialPalette.burntChestnut,
    fontSize: 42,
    fontWeight: "800",
  },
  badge: {
    alignItems: "center",
    backgroundColor: officialPalette.deepWood,
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 3,
    bottom: 4,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    width: 34,
  },
  badgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  profileStats: {
    flex: 1,
    justifyContent: "center",
  },
  stat: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  statValue: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "800",
    letterSpacing: -0.45,
  },
  statLabel: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "700",
    marginTop: 2,
  },
  name: {
    color: colors.text,
    fontSize: typography.title + 4,
    fontWeight: "800",
    letterSpacing: -0.65,
    marginTop: 18,
  },
  location: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: "700",
    marginTop: 4,
  },
  insetWell: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.white,
    padding: 14,
  },
});

function briefToneFg(t?: BuildingOwnerTone) {
  if (t === "good") return colors.green;
  if (t === "warn") return colors.amber;
  if (t === "bad") return colors.red;
  return colors.text;
}

function toneColor(tone: BuildingOwnerTone = "neutral") {
  if (tone === "good") {
    return colors.green;
  }
  if (tone === "warn") {
    return colors.amber;
  }
  if (tone === "bad") {
    return colors.red;
  }
  return colors.orange;
}
