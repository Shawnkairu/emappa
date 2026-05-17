import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { AppMark, Label, PaletteCard, Pill, Surface, colors, typography } from "@emappa/ui";
import { ProposedFlowRibbon } from "../design-handoff";

export function ProposedPageChrome({
  section,
  workspace,
  title,
  subtitle,
  actions,
  hero,
  children,
}: {
  section: string;
  workspace: string;
  title: string;
  subtitle: string;
  actions: string[];
  hero: { label: string; value: string; sub: string; status?: string; statusTone?: "good" | "warn" | "bad" | "neutral" };
  children: ReactNode;
}) {
  return (
    <Surface>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        <ProposedFlowRibbon />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <View>
            <Pill>{section}</Pill>
            <Text
              style={{
                color: colors.muted,
                fontSize: typography.micro,
                fontWeight: "600",
                letterSpacing: 0.7,
                marginTop: 10,
                textTransform: "uppercase",
              }}
            >
              {workspace}
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
            marginTop: 18,
            lineHeight: typography.hero + 6,
          }}
        >
          {title}
        </Text>
        <Text style={{ color: colors.muted, fontSize: typography.body, lineHeight: 22, marginTop: 10, marginBottom: 14 }}>
          {subtitle}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {actions.map((action, index) => (
            <View
              key={action}
              style={{
                borderRadius: 999,
                backgroundColor: index === 0 ? colors.orangeDeep : colors.panelSoft,
                borderColor: index === 0 ? colors.orangeDeep : colors.border,
                borderWidth: 1,
                paddingHorizontal: 14,
                paddingVertical: 9,
                marginRight: 8,
              }}
            >
              <Text style={{ color: index === 0 ? colors.white : colors.text, fontSize: 12, fontWeight: "600" }}>{action}</Text>
            </View>
          ))}
        </ScrollView>
        <PaletteCard borderRadius={28} padding={18} style={{ marginBottom: 16 }}>
          <Label>{hero.label}</Label>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: "600", letterSpacing: -1, marginTop: 8 }}>{hero.value}</Text>
          <Text style={{ color: colors.muted, fontSize: typography.small, lineHeight: 20, marginTop: 6 }}>{hero.sub}</Text>
          {hero.status ? (
            <View style={{ marginTop: 10 }}>
              <Pill tone={hero.statusTone ?? "neutral"}>{hero.status}</Pill>
            </View>
          ) : null}
        </PaletteCard>
        {children}
      </ScrollView>
    </Surface>
  );
}

export function WireframeWell({
  height = 120,
  label,
}: {
  height?: number;
  label: string;
}) {
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
