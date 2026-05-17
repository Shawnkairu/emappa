import { Stack } from "expo-router";
import { colors } from "@emappa/ui";

export default function OnboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackVisible: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontSize: 17, fontWeight: "700" },
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="welcome" options={{ title: "Welcome", headerShown: false }} />
      <Stack.Screen name="resident/index" options={{ title: "Join building" }} />
      <Stack.Screen name="resident/confirm" options={{ title: "Confirm building" }} />
      <Stack.Screen name="resident/load-profile" options={{ title: "Load estimate" }} />
      <Stack.Screen name="resident/capacity-check" options={{ title: "Capacity check" }} />
      <Stack.Screen name="resident/first-pledge" options={{ title: "Pledge or buy" }} />
      <Stack.Screen name="homeowner/address" options={{ title: "Home address" }} />
      <Stack.Screen name="homeowner/roof-capture" options={{ title: "Roof capture" }} />
      <Stack.Screen name="homeowner/terms" options={{ title: "Terms preview" }} />
      <Stack.Screen name="homeowner/first-pledge" options={{ title: "First pledge" }} />
      <Stack.Screen name="building-owner/index" options={{ title: "Building basics" }} />
      <Stack.Screen name="building-owner/roof" options={{ title: "Roof capture" }} />
      <Stack.Screen name="building-owner/terms" options={{ title: "Terms preview" }} />
      <Stack.Screen name="provider/index" options={{ title: "Business basics" }} />
      <Stack.Screen name="provider/inventory" options={{ title: "Inventory snapshot" }} />
      <Stack.Screen name="electrician/index" options={{ title: "Electrician basics" }} />
      <Stack.Screen name="electrician/cert" options={{ title: "Certification" }} />
      <Stack.Screen name="financier/index" options={{ title: "Investor profile" }} />
    </Stack>
  );
}
