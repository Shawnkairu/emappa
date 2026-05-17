import { Stack } from "expo-router";
import { colors } from "@emappa/ui";

/** Stack for drill-in financier flows (payback, deal room, statements). */
export default function FinancierEmbeddedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        animation: "slide_from_right",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    />
  );
}
