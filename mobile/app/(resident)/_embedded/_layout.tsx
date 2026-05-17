import { Stack } from "expo-router";
import { colors } from "@emappa/ui";

export default function ResidentEmbeddedLayout() {
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
