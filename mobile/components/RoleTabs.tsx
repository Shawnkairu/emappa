import { Platform, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMobileSections, type StakeholderRole } from "@emappa/shared";
import { colors } from "@emappa/ui";

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: "home-outline",
  discover: "compass-outline",
  jobs: "construct-outline",
  compliance: "ribbon-outline",
  wallet: "wallet-outline",
  usage: "pulse-outline",
  energy: "flash-outline",
  ownership: "aperture-outline",
  profile: "person-circle-outline",
  support: "help-buoy-outline",
  drs: "shield-checkmark-outline",
  earnings: "leaf-outline",
  assets: "sunny-outline",
  performance: "analytics-outline",
  shares: "git-branch-outline",
  maintenance: "build-outline",
  deployment: "trail-sign-outline",
  deals: "briefcase-outline",
  "deal-detail": "document-text-outline",
  generation: "flash-outline",
  certification: "ribbon-outline",
  checklist: "checkbox-outline",
  "job-detail": "camera-outline",
  catalog: "albums-outline",
  "quote-requests": "receipt-outline",
  orders: "cube-outline",
  reliability: "sparkles-outline",
  projects: "grid-outline",
  alerts: "warning-outline",
};

function TabBarChromeBackground() {
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />;
}

const hiddenTabRoutes: Partial<Record<StakeholderRole, string[]>> = {
  provider: ["inventory", "qualified-projects", "commit-capacity", "accept-terms", "deployment", "maintenance", "performance"],
  financier: ["_embedded"],
  electrician: ["jobs-inbox", "compliance"],
  building_owner: ["compare-today", "resident-roster", "approve-terms", "owner-account"],
};

export function RoleTabs({ role }: { role: StakeholderRole }) {
  const insets = useSafeAreaInsets();
  const tabBarInsetBottom = Platform.OS === "ios" ? Math.max(insets.bottom, 8) : Math.max(insets.bottom, 10);

  const sectionByRoute = Object.fromEntries(
    getMobileSections(role).map((section) => [
      section.mobileRoute?.split("/").at(-1) ?? section.id,
      section,
    ]),
  );

  const hidden = hiddenTabRoutes[role] ?? [];

  return (
    <Tabs
      initialRouteName={role === "admin" ? "alerts" : undefined}
      screenOptions={({ route }) => {
        const label = sectionByRoute[route.name]?.label ?? titleizeRoute(route.name);
        return {
          title: label,
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: "600",
            fontSize: 17,
            color: colors.text,
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            minHeight: 52 + tabBarInsetBottom,
            paddingTop: 8,
            paddingBottom: tabBarInsetBottom,
          },
          tabBarBackground: TabBarChromeBackground,
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.orangeDeep,
          tabBarInactiveTintColor: colors.dim,
          tabBarAccessibilityLabel: label,
          tabBarLabel: label,
          tabBarLabelStyle: { fontWeight: "700", fontSize: 10, marginTop: 2 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={icons[route.name] ?? "ellipse-outline"} color={color} size={Math.max(16, size - 8)} />
          ),
        };
      }}
    >
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}

function titleizeRoute(routeName: string) {
  return routeName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
