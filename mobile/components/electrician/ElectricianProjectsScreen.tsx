import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors, typography } from "@emappa/ui";
import { ElectricianHomeScreen } from "./ElectricianHomeScreen";
import { ElectricianJobsInboxScreen } from "./ElectricianJobsInboxScreen";

type ProjectsSegment = "today" | "queue";

export function ElectricianProjectsScreen() {
  const [segment, setSegment] = useState<ProjectsSegment>("today");

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ProjectsSegmentSwitcher segment={segment} onSegmentChange={setSegment} />
      {segment === "today" ? <ElectricianHomeScreen /> : <ElectricianJobsInboxScreen />}
    </View>
  );
}

function ProjectsSegmentSwitcher({
  segment,
  onSegmentChange,
}: {
  segment: ProjectsSegment;
  onSegmentChange: (next: ProjectsSegment) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 4,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      {(
        [
          ["today", "Today"],
          ["queue", "Queue"],
        ] as const
      ).map(([key, label]) => {
        const selected = segment === key;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={key}
            onPress={() => onSegmentChange(key)}
            style={{
              flex: 1,
              alignItems: "center",
              borderRadius: 999,
              paddingVertical: 9,
              backgroundColor: selected ? `${colors.orangeDeep}18` : colors.white,
              borderWidth: 1,
              borderColor: selected ? `${colors.orangeDeep}44` : colors.border,
            }}
          >
            <Text
              style={{
                color: selected ? colors.orangeDeep : colors.muted,
                fontSize: typography.small,
                fontWeight: "800",
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
