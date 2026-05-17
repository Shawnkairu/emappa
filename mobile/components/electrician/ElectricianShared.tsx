import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getRoleHome } from "@emappa/api-client";
import type { ProjectedBuilding } from "@emappa/shared";
import {
  AppMark,
  colors,
  GlassCard,
  Label,
  PaletteCard,
  Pill,
  typography,
  Value,
  radius,
  shadows,
  spacing,
} from "@emappa/ui";
import { PilotBanner } from "../PilotBanner";

export type ElectricianTone = "good" | "warn" | "bad" | "neutral";

export interface ElectricianHero {
  label: string;
  value: string;
  sub: string;
  tone?: ElectricianTone;
}

export interface ElectricianStatusItem {
  label: string;
  value: string;
  note: string;
  tone?: ElectricianTone;
}

export interface ElectricianRowItem {
  label: string;
  value: string;
  note: string;
  tone?: ElectricianTone;
}

export interface ElectricianActionItem {
  label: string;
  detail: string;
  status: string;
  tone?: ElectricianTone;
}

export function ElectricianScaffold({
  section,
  title,
  subtitle,
  actions,
  hero,
  immersive = false,
  children,
}: {
  section: string;
  title: string;
  subtitle: string;
  actions: string[];
  hero: (building: ProjectedBuilding) => ElectricianHero;
  /** Tesla/Enphase-style full-bleed status hero; hides document title and KPI hero card. */
  immersive?: boolean;
  children: (building: ProjectedBuilding) => ReactNode;
}) {
  const [building, setBuilding] = useState<ProjectedBuilding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setError(null);
    getRoleHome("electrician")
      .then((home) => {
        setBuilding(home.primary);
      })
      .catch(() => {
        setError("Unable to load electrician work.");
      });
  }, []);

  if (error) {
    return (
      <ElectricianCanvas>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <AppMark size={52} />
          <Text style={{ color: colors.text, fontSize: typography.title, fontWeight: "700", letterSpacing: -0.45, marginTop: 18 }}>
            Offline
          </Text>
          <Text style={{ color: colors.muted, fontSize: typography.small, marginTop: 8, lineHeight: 20 }}>{error}</Text>
        </View>
      </ElectricianCanvas>
    );
  }

  if (!building) {
    return (
      <ElectricianCanvas>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <AppMark size={52} />
          <Text style={{ color: colors.text, fontSize: typography.title, fontWeight: "700", letterSpacing: -0.45, marginTop: 18 }}>
            Loading jobs
          </Text>
        </View>
      </ElectricianCanvas>
    );
  }

  const h = hero(building);

  return (
    <ElectricianCanvas>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 34 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <View>
            <Pill>{section}</Pill>
            <Text
              style={{
                color: colors.orangeDeep,
                fontSize: typography.micro,
                fontWeight: "800",
                letterSpacing: 0.75,
                marginTop: 10,
                textTransform: "uppercase",
              }}
            >
              Electrician
            </Text>
          </View>
          <AppMark />
        </View>
        {immersive ? null : (
          <>
            <Text
              style={{
                color: colors.text,
                fontSize: 31,
                fontWeight: "800",
                letterSpacing: -1,
                lineHeight: 37,
                marginTop: 18,
              }}
            >
              {title}
            </Text>
            <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 20, marginTop: 8, marginBottom: 12 }}>
              {subtitle}
            </Text>
          </>
        )}
        <PilotBanner compact title="Pilot / demo field shell" />
        {!immersive && actions.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginBottom: 14 }}>
            {actions.map((action, index) => (
              <Pressable
                accessibilityRole="button"
                key={action}
                onPress={() => router.push(getElectricianActionTarget(action))}
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
        ) : null}
        {immersive ? null : <ElectricianHeroCard hero={h} />}
        {children(building)}
      </ScrollView>
    </ElectricianCanvas>
  );
}

function ElectricianCanvas({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 12 }}>
      {children}
    </View>
  );
}

function ElectricianHeroCard({ hero }: { hero: ElectricianHero }) {
  return (
    <PaletteCard borderRadius={30} padding={20} style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Label>{hero.label}</Label>
          <Text
            style={{
              color: colors.text,
              fontSize: 36,
              fontWeight: "800",
              letterSpacing: -1.1,
              marginTop: 8,
              lineHeight: 42,
            }}
          >
            {hero.value}
          </Text>
          <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 19, marginTop: 4 }}>{hero.sub}</Text>
        </View>
        <StatusOrb tone={hero.tone} />
      </View>
    </PaletteCard>
  );
}

export function StatusOrb({ tone = "neutral", label }: { tone?: ElectricianTone; label?: string }) {
  const color = toneColor(tone);

  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          borderColor: color,
          borderWidth: 2,
          backgroundColor: colors.white,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: color }} />
      </View>
      {label ? <Text style={{ color, fontSize: typography.micro, fontWeight: "800", textTransform: "uppercase" }}>{label}</Text> : null}
    </View>
  );
}

/** Layered field row for checklist-style stacks on white surfaces. */
export function ElectricianFieldRow({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        backgroundColor: colors.white,
        padding: spacing.md,
        ...shadows.soft,
      }}
    >
      {children}
    </View>
  );
}

export function ElectricianStatusGrid({ items }: { items: ElectricianStatusItem[] }) {
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={{
            flex: 1,
            minHeight: 104,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.lg,
            backgroundColor: colors.white,
            padding: spacing.md,
            ...shadows.soft,
          }}
        >
          <Pill tone={item.tone ?? "neutral"}>{item.label}</Pill>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.heading,
              fontWeight: "700",
              letterSpacing: -0.4,
              marginTop: 11,
            }}
          >
            {item.value}
          </Text>
          <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 18, marginTop: 6 }}>{item.note}</Text>
        </View>
      ))}
    </View>
  );
}

export function ElectricianBrief({
  eyebrow,
  title,
  body,
  rows,
}: {
  eyebrow: string;
  title: string;
  body: string;
  rows: ElectricianRowItem[];
}) {
  return (
    <GlassCard>
      <Label>{eyebrow}</Label>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.title,
          fontWeight: "700",
          letterSpacing: -0.5,
          marginTop: 6,
          lineHeight: typography.title + 6,
        }}
      >
        {title}
      </Text>
      {body ? <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 20, marginTop: 8 }}>{body}</Text> : null}
      <View
        style={{
          marginTop: 14,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          overflow: "hidden",
          backgroundColor: colors.white,
          ...shadows.soft,
        }}
      >
        {rows.map((row, index) => (
          <View
            key={`${row.label}-${row.value}`}
            style={{
              padding: spacing.md,
              backgroundColor: colors.white,
              borderTopColor: index === 0 ? "transparent" : colors.border,
              borderTopWidth: index === 0 ? 0 : 1,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: typography.micro,
                  fontWeight: "600",
                  letterSpacing: 0.65,
                  textTransform: "uppercase",
                }}
              >
                {row.label}
              </Text>
              <Text style={{ color: toneColor(row.tone), flexShrink: 0, fontWeight: "700" }}>{row.value}</Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 19, marginTop: 5 }}>{row.note}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export function ElectricianActionList({
  eyebrow = "Field sequence",
  title,
  items,
}: {
  eyebrow?: string;
  title: string;
  items: ElectricianActionItem[];
}) {
  return (
    <GlassCard>
      <Label>{eyebrow}</Label>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.title,
          fontWeight: "700",
          letterSpacing: -0.5,
          marginTop: 6,
          lineHeight: typography.title + 4,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          marginTop: spacing.md,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
          backgroundColor: colors.white,
          ...shadows.soft,
        }}
      >
        {items.map((item, index) => (
          <View
            key={item.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.sm,
              backgroundColor: colors.white,
              borderTopColor: index === 0 ? "transparent" : colors.border,
              borderTopWidth: index === 0 ? 0 : 1,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: typography.body, fontWeight: "600" }}>{item.label}</Text>
              <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 19, marginTop: 4 }}>{item.detail}</Text>
            </View>
            <Pill tone={item.tone ?? "neutral"}>{item.status}</Pill>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export function ElectricianEvidenceList({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; detail: string; complete: boolean }>;
}) {
  const completeCount = items.filter((item) => item.complete).length;

  return (
    <GlassCard>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <View>
          <Label>Evidence</Label>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.title,
              fontWeight: "700",
              letterSpacing: -0.5,
              marginTop: 5,
              lineHeight: typography.title + 4,
            }}
          >
            {title}
          </Text>
        </View>
        <Pill tone={completeCount === items.length ? "good" : "warn"}>{completeCount}/{items.length}</Pill>
      </View>
      <View
        style={{
          marginTop: spacing.sm,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
          backgroundColor: colors.white,
          ...shadows.soft,
        }}
      >
      {items.map((item, index) => (
        <View
          key={item.label}
          style={{
            flexDirection: "row",
            gap: spacing.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.sm,
            backgroundColor: colors.white,
            borderTopColor: index === 0 ? "transparent" : colors.border,
            borderTopWidth: index === 0 ? 0 : 1,
          }}
        >
          <View
            style={{
              height: 24,
              width: 24,
              borderRadius: 999,
              backgroundColor: item.complete ? `${colors.green}18` : `${colors.amber}18`,
              borderColor: item.complete ? colors.green : colors.amber,
              borderWidth: 1,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            <View style={{ height: 8, width: 8, borderRadius: 999, backgroundColor: item.complete ? colors.green : colors.amber }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: typography.body, fontWeight: "600" }}>{item.label}</Text>
            <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 19, marginTop: 4 }}>{item.detail}</Text>
          </View>
        </View>
      ))}
      </View>
    </GlassCard>
  );
}

export function ElectricianMetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <GlassCard>
      <Label>{label}</Label>
      <Value>{value}</Value>
      <Text style={{ color: colors.muted, fontSize: typography.small, marginTop: 7, lineHeight: 19 }}>{detail}</Text>
    </GlassCard>
  );
}

export function ElectricianTrustCard({
  name,
  role,
  status,
  tone,
  stats,
  checks,
}: {
  name: string;
  role: string;
  status: string;
  tone: ElectricianTone;
  stats: Array<{ label: string; value: string }>;
  checks: Array<{ label: string; detail: string; complete: boolean }>;
}) {
  return (
    <GlassCard>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            backgroundColor: colors.orangeDeep,
            alignItems: "center",
            justifyContent: "center",
            ...shadows.soft,
          }}
        >
          <Text style={{ color: colors.white, fontSize: 26, fontWeight: "900" }}>{name.slice(0, 1)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Label>Trust card</Label>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.6, marginTop: 5 }}>{name}</Text>
          <Text style={{ color: colors.muted, fontSize: typography.small, marginTop: 3 }}>{role}</Text>
        </View>
        <StatusOrb tone={tone} label={status} />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              backgroundColor: colors.white,
            }}
          >
            <Text style={{ color: colors.text, fontSize: typography.heading, fontWeight: "800" }}>{stat.value}</Text>
            <Text style={{ color: colors.muted, fontSize: typography.micro, fontWeight: "700", marginTop: 4, textTransform: "uppercase" }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {checks.map((check) => (
          <View key={check.label} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <StatusDot complete={check.complete} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: typography.body, fontWeight: "700" }}>{check.label}</Text>
              <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 18, marginTop: 2 }}>{check.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export function StatusDot({ complete }: { complete: boolean }) {
  const color = complete ? colors.green : colors.amber;

  return (
    <View
      style={{
        height: 26,
        width: 26,
        borderRadius: 999,
        borderColor: color,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.white,
      }}
    >
      <View style={{ height: 10, width: 10, borderRadius: 999, backgroundColor: color }} />
    </View>
  );
}

function getElectricianActionTarget(action: string) {
  const normalized = action.toLowerCase();

  if (normalized.includes("crew") || normalized.includes("queue") || normalized.includes("accept")) return "/(electrician)/projects";
  if (normalized.includes("projects") || normalized.includes("today") || normalized.includes("job board")) return "/(electrician)/projects";
  if (normalized.includes("discover")) return "/(electrician)/discover";
  if (
    normalized.includes("license") ||
    normalized.includes("compliance") ||
    normalized.includes("certification") ||
    normalized.includes("credential") ||
    normalized.includes("training")
  )
    return "/(electrician)/profile";
  if (
    normalized.includes("wallet") ||
    normalized.includes("ticket") ||
    normalized.includes("service") ||
    normalized.includes("pay")
  )
    return "/(electrician)/wallet";
  if (normalized.includes("profile")) return "/(electrician)/profile";
  return "/(electrician)/projects";
}

function toneColor(tone?: ElectricianTone) {
  if (tone === "good") return colors.green;
  if (tone === "warn") return colors.amber;
  if (tone === "bad") return colors.red;
  return colors.text;
}

export { colors, GlassCard, Label, Pill, Value };
