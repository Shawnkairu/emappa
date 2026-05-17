import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, Label, Pill, PrimaryButton } from "@emappa/ui";
import { RoofPolygonViewer } from "../../shared";
import {
  canRetraceRoof,
  retraceDetail,
  retraceHref,
  roofConfidenceLabel,
  roofConfidenceTone,
  roofSourceLabel,
  roofSourceTone,
} from "../homeownerProfileLogic";
import { EmbeddedIconBadge, EmbeddedRow, EmbeddedWhiteCard, HomeownerEmbeddedFrame } from "../homeownerEmbeddedUi";
import { formatArea, type HomeownerSnapshot } from "../homeownerSnapshot";
import { useApi } from "../../../lib/api";

export function HomeownerRoofDetailScreen() {
  return (
    <HomeownerEmbeddedFrame title="Roof" subtitle="Polygon review, source confidence, and manual area fallback.">
      {(snapshot, refetch) => <RoofDetailBody snapshot={snapshot} refetch={refetch} />}
    </HomeownerEmbeddedFrame>
  );
}

function RoofDetailBody({ snapshot, refetch }: { snapshot: HomeownerSnapshot; refetch: () => void }) {
  const api = useApi();
  const router = useRouter();
  const building = snapshot.building!;
  const source = building.roofSource;
  const [area, setArea] = useState(building.roofAreaM2 ? String(building.roofAreaM2) : "");
  const [status, setStatus] = useState<string | null>(null);

  async function saveRoof() {
    const areaM2 = Number(area);
    if (!Number.isFinite(areaM2) || areaM2 <= 0) {
      setStatus("Enter a positive roof area before saving.");
      return;
    }
    setStatus("Saving roof evidence...");
    await api.setRoof(building.id, { areaM2, source: "owner_typed" });
    setStatus("Roof evidence saved. Refreshing...");
    refetch();
  }

  return (
    <>
      <RoofPolygonViewer
        title={building.name}
        areaSqm={building.roofAreaM2 ?? undefined}
        confidenceLabel={roofConfidenceLabel(building.roofConfidence)}
      />
      <EmbeddedWhiteCard>
        <Label>Roof record</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Pill tone={roofSourceTone(source)}>{roofSourceLabel(source)}</Pill>
          <Pill tone={roofConfidenceTone(building.roofConfidence)}>{roofConfidenceLabel(building.roofConfidence)}</Pill>
        </View>
        <EmbeddedRow label="Usable area" value={formatArea(building.roofAreaM2)} note={building.address} />
        {canRetraceRoof(source) ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(retraceHref(building) as never)}
            style={{
              alignItems: "center",
              backgroundColor: `${colors.orangeDeep}08`,
              borderColor: `${colors.orangeDeep}24`,
              borderRadius: 16,
              borderWidth: 1,
              flexDirection: "row",
              gap: 12,
              padding: 12,
            }}
          >
            <Ionicons name="scan-outline" color={colors.orangeDeep} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>Retrace on satellite</Text>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600" }}>{retraceDetail(source)}</Text>
            </View>
            <Ionicons name="chevron-forward" color={colors.muted} size={18} />
          </Pressable>
        ) : null}
      </EmbeddedWhiteCard>
      <EmbeddedWhiteCard>
        <EmbeddedIconBadge name="home-outline" />
        <Text style={{ color: "#2a1a12", fontSize: 17, fontWeight: "800" }}>Manual area fallback</Text>
        <TextInput
          value={area}
          onChangeText={setArea}
          keyboardType="decimal-pad"
          placeholder="Usable roof area m²"
          placeholderTextColor={colors.dim}
          style={{
            borderColor: colors.border,
            borderRadius: 14,
            borderWidth: 1,
            color: colors.text,
            fontSize: 15,
            fontWeight: "600",
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        />
        {status ? <Text style={{ color: "#7a6558" }}>{status}</Text> : null}
        <PrimaryButton onPress={saveRoof}>Save roof area</PrimaryButton>
      </EmbeddedWhiteCard>
    </>
  );
}
