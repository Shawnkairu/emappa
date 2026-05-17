import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getRoleHome } from "@emappa/api-client";
import type { ProjectedBuilding, StakeholderRole } from "@emappa/shared";
import { AppMark, colors, PaletteCard, Pill, shadows, Surface, typography } from "@emappa/ui";
import { BuildingPulse, KillSwitchBanner } from "../design-handoff";

export function RoleDashboardScaffold({
  role,
  section,
  title,
  subtitle,
  actions,
  renderHero,
  renderPanels,
  cohesionRole,
}: {
  role: StakeholderRole;
  section: string;
  title: string;
  subtitle: string;
  actions: string[];
  renderHero: (building: ProjectedBuilding) => HeroMetric;
  renderPanels: (building: ProjectedBuilding) => ReactNode;
  /** When set, renders BuildingPulse + KillSwitchBanner after the hero (design handoff). */
  cohesionRole?: StakeholderRole;
}) {
  const [building, setBuilding] = useState<ProjectedBuilding | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    getRoleHome(role)
      .then((home) => {
        setBuilding(home.primary);
      })
      .catch(() => {
        setError("We could not load this role workspace. Check the API connection or retry in mock mode.");
      });
  }, [role]);

  if (error) {
    return (
      <Surface>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <AppMark size={52} />
          <Text style={{ color: colors.text, fontSize: typography.title, fontWeight: "600", letterSpacing: -0.45, marginTop: 18 }}>
            Role view unavailable
          </Text>
          <Text style={{ color: colors.muted, fontSize: typography.small, marginTop: 8, lineHeight: 20 }}>{error}</Text>
        </View>
      </Surface>
    );
  }

  if (!building) {
    return (
      <Surface>
        <View style={{ flex: 1, justifyContent: "center" }}>
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
            Preparing your role view
          </Text>
          <Text style={{ color: colors.muted, fontSize: typography.small, marginTop: 8, lineHeight: 20 }}>
            Loading e.mappa…
          </Text>
        </View>
      </Surface>
    );
  }

  const hero = renderHero(building);

  return (
    <Surface>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 34 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 22 }}>
          <View>
            <Pill>{section}</Pill>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "500", letterSpacing: 0.7, marginTop: 10, textTransform: "uppercase" }}>
              {role} workspace
            </Text>
          </View>
          <AppMark />
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.hero,
            fontWeight: "600",
            letterSpacing: -0.9,
            lineHeight: typography.hero + 8,
            marginTop: 20,
          }}
        >
          {title}
        </Text>
        <Text style={{ color: colors.muted, fontSize: typography.body, lineHeight: 22, marginTop: 9, marginBottom: 16 }}>
          {subtitle}
        </Text>

        <ActionRail role={role} actions={actions} />
        <HeroMetricCard hero={hero} />
        {cohesionRole ? (
          <>
            <BuildingPulse role={cohesionRole} building={building} />
            <KillSwitchBanner building={building} />
          </>
        ) : null}
        {renderPanels(building)}
      </ScrollView>
    </Surface>
  );
}

export interface HeroMetric {
  label: string;
  value: string;
  sub: string;
}

function HeroMetricCard({ hero }: { hero: HeroMetric }) {
  return (
    <PaletteCard borderRadius={30} padding={20} style={{ marginBottom: 16 }}>
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
          fontSize: typography.hero + 4,
          fontWeight: "600",
          letterSpacing: -1,
          marginTop: 9,
          lineHeight: typography.hero + 10,
        }}
      >
        {hero.value}
      </Text>
      <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 20, marginTop: 6 }}>{hero.sub}</Text>
    </PaletteCard>
  );
}

function ActionRail({ role, actions }: { role: StakeholderRole; actions: string[] }) {
  const router = useRouter();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
      {actions.map((action, index) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action}
          key={action}
          onPress={() => {
            const target = getActionTarget(role, action);
            router.push(target);
          }}
          style={{
            borderRadius: 999,
            backgroundColor: index === 0 ? colors.orangeDeep : colors.white,
            borderColor: index === 0 ? colors.orangeDeep : colors.border,
            borderWidth: 1,
            paddingHorizontal: 14,
            paddingVertical: 9,
            marginRight: 8,
            ...shadows.soft,
          }}
        >
          <Text style={{ color: index === 0 ? colors.white : colors.text, fontSize: 12, fontWeight: "700" }}>{action}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function getActionTarget(role: StakeholderRole, action: string) {
  const normalized = action.toLowerCase();
  const fallbackByRole: Record<StakeholderRole, string> = {
    resident: "/(resident)/home",
    homeowner: "/(homeowner)/home",
    building_owner: "/(building-owner)/home",
    provider: "/(provider)/discover",
    financier: "/(financier)/discover",
    electrician: "/(electrician)/discover",
    admin: "/(admin)/alerts",
  };
  const fallback = fallbackByRole[role];
  const targets: Record<StakeholderRole, Array<[string, string]>> = {
    resident: [
      ["top up", "/(resident)/wallet"],
      ["token", "/(resident)/wallet"],
      ["flow", "/(resident)/energy"],
      ["usage", "/(resident)/energy"],
      ["energy", "/(resident)/energy"],
      ["saving", "/(resident)/energy"],
      ["share", "/(resident)/wallet"],
      ["building", "/(resident)/profile"],
      ["issue", "/(resident)/profile"],
      ["question", "/(resident)/profile"],
    ],
    homeowner: [
      ["market", "/(homeowner)/_embedded/marketplace"],
      ["share", "/(homeowner)/_embedded/marketplace"],
      ["access", "/(homeowner)/_embedded/approve-terms"],
      ["terms", "/(homeowner)/_embedded/approve-terms"],
      ["drs", "/(homeowner)/_embedded/drs"],
      ["gate", "/(homeowner)/_embedded/drs"],
      ["blocker", "/(homeowner)/_embedded/drs"],
      ["deploy", "/(homeowner)/_embedded/deployment"],
      ["go-live", "/(homeowner)/_embedded/deployment"],
      ["compare", "/(homeowner)/_embedded/compare-today"],
      ["roof", "/(homeowner)/_embedded/roof-detail"],
      ["start", "/(homeowner)/_embedded/start-project"],
      ["draft", "/(homeowner)/home"],
      ["account", "/(homeowner)/profile"],
    ],
    building_owner: [
      ["invite", "/(building-owner)/_embedded/resident-roster"],
      ["resident", "/(building-owner)/_embedded/resident-roster"],
      ["access", "/(building-owner)/_embedded/approve-terms"],
      ["terms", "/(building-owner)/_embedded/approve-terms"],
      ["drs", "/(building-owner)/_embedded/drs"],
      ["gate", "/(building-owner)/_embedded/drs"],
      ["blocker", "/(building-owner)/_embedded/drs"],
      ["deploy", "/(building-owner)/_embedded/deployment"],
      ["go-live", "/(building-owner)/_embedded/deployment"],
      ["compare", "/(building-owner)/_embedded/compare-today"],
      ["account", "/(building-owner)/owner-account"],
      ["draft", "/(building-owner)/home"],
    ],
    provider: [
      ["asset", "/(provider)/assets"],
      ["capacity", "/(provider)/commit-capacity"],
      ["qualified", "/(provider)/qualified-projects"],
      ["project", "/(provider)/qualified-projects"],
      ["payout", "/(provider)/wallet"],
      ["revenue", "/(provider)/wallet"],
      ["share", "/(provider)/generation"],
      ["ledger", "/(provider)/generation"],
      ["gate", "/(provider)/deployment"],
      ["supplier", "/(provider)/deployment"],
      ["maintenance", "/(provider)/maintenance"],
      ["warranty", "/(provider)/maintenance"],
      ["utilization", "/(provider)/performance"],
      ["waste", "/(provider)/performance"],
    ],
    financier: [
      ["deal", "/(financier)/discover"],
      ["drs", "/(financier)/discover"],
      ["evidence", "/(financier)/portfolio"],
      ["stress", "/(financier)/portfolio"],
      ["recovery", "/(financier)/portfolio"],
      ["exposure", "/(financier)/portfolio"],
      ["tranche", "/(financier)/_embedded/payback-scenarios"],
      ["release", "/(financier)/_embedded/payback-scenarios"],
      ["payback", "/(financier)/_embedded/payback-scenarios"],
      ["scenario", "/(financier)/_embedded/payback-scenarios"],
    ],
    electrician: [
      ["site", "/(electrician)/jobs"],
      ["capture", "/(electrician)/jobs"],
      ["photo", "/(electrician)/jobs"],
      ["reading", "/(electrician)/jobs"],
      ["checklist", "/(electrician)/jobs"],
      ["signoff", "/(electrician)/jobs"],
      ["lead", "/(electrician)/compliance"],
      ["license", "/(electrician)/compliance"],
      ["ticket", "/(electrician)/jobs"],
      ["data", "/(electrician)/jobs"],
      ["crew", "/(electrician)/jobs-inbox"],
      ["job", "/(electrician)/jobs-inbox"],
    ],
    admin: [
      ["drs", "/(admin)/projects"],
      ["project", "/(admin)/projects"],
      ["stage", "/(admin)/projects"],
      ["alert", "/(admin)/alerts"],
      ["pause", "/(admin)/alerts"],
      ["audit", "/(admin)/alerts"],
      ["proof", "/(admin)/alerts"],
    ],
  };

  return targets[role].find(([keyword]) => normalized.includes(keyword))?.[1] ?? fallback;
}
