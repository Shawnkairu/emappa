import { useState } from "react";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { GlassCard } from "@emappa/ui";
import {
  ActionButton,
  ChoiceGroup,
  OnboardShell,
  StatusText,
  TextField,
  errorMessage,
  styles,
  useGeocodedAddress,
} from "../_shared";
import { useApi } from "../../../lib/api";

type JoinMode = "invite" | "manual";

export default function ResidentFindBuildingScreen() {
  const api = useApi();
  const router = useRouter();
  const [mode, setMode] = useState<JoinMode>("invite");
  const [unitNumber, setUnitNumber] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [code, setCode] = useState("");
  const [locationRequested, setLocationRequested] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address, setAddress, geocode, isGeocoding, geocodeError, geocodeAddress } = useGeocodedAddress();

  function requestLocation() {
    setLocationRequested(true);
    setError(null);
  }

  function goConfirm(params: Record<string, string>) {
    router.push({
      pathname: "/(onboard)/resident/confirm",
      params,
    });
  }

  async function continueJoin() {
    const trimmedUnit = unitNumber.trim();
    if (!trimmedUnit) {
      setError("Enter your apartment unit number (e.g. 4B).");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      if (mode === "invite") {
        const inviteCode = code.trim();
        if (!inviteCode) {
          setError("Enter the building invite code from your owner or QR card.");
          setIsJoining(false);
          return;
        }
        const result = await api.joinBuilding(inviteCode);
        goConfirm({
          buildingId: result.building.id,
          name: result.building.name,
          address: result.building.address,
          kind: result.building.kind,
          unitCount: String(result.building.unitCount),
          unitNumber: trimmedUnit,
          inviteCode,
        });
        return;
      }

      const trimmedName = buildingName.trim();
      const trimmedAddress = address.trim();
      if (!trimmedName) {
        setError("Enter your building name so we can match or create demand evidence.");
        setIsJoining(false);
        return;
      }
      if (!geocode && trimmedAddress) {
        await geocodeAddress();
      }
      if (!geocode && !trimmedAddress) {
        setError("Enter a manual address fallback, then blur the field to geocode.");
        setIsJoining(false);
        return;
      }

      goConfirm({
        buildingId: "",
        name: trimmedName,
        address: geocode?.formattedAddress ?? trimmedAddress,
        kind: "apartment",
        unitCount: "—",
        unitNumber: trimmedUnit,
        manualFallback: "true",
        lat: geocode ? String(geocode.lat) : "",
        lon: geocode ? String(geocode.lon) : "",
      });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <OnboardShell
      eyebrow="Resident"
      title="Find your building"
      footer={
        <ActionButton
          onPress={continueJoin}
          disabled={isJoining || isGeocoding}
          accessibilityLabel={isJoining ? "Saving building details" : "Continue to confirm building"}
        >
          {isJoining || isGeocoding ? "Checking…" : "Continue"}
        </ActionButton>
      }
    >
      <GlassCard>
        <ChoiceGroup
          label="How are you joining?"
          value={mode}
          onChange={setMode}
          options={[
            {
              label: "Owner invite code",
              value: "invite",
              detail: "Fastest when your building owner already enrolled on e.mappa.",
            },
            {
              label: "Building not listed yet",
              value: "manual",
              detail: "Name + manual address fallback when you do not have a code.",
            },
          ]}
        />
      </GlassCard>

      <GlassCard>
        <Pressable
          onPress={requestLocation}
          accessibilityRole="button"
          accessibilityLabel="Request location permission to match nearby buildings"
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>{locationRequested ? "Location noted" : "Use my location"}</Text>
        </Pressable>
        <Text style={styles.helper}>
          {locationRequested
            ? "Location permission will refine building search when native GPS is enabled. You can still enter details manually."
            : "Scenario A §4 asks for location permission to match nearby buildings. Tap to acknowledge before continuing."}
        </Text>
        <TextField
          label="Apartment unit number"
          value={unitNumber}
          onChangeText={setUnitNumber}
          placeholder="e.g. 4B"
        />
      </GlassCard>

      {mode === "invite" ? (
        <GlassCard>
          <TextField
            label="Owner invite code"
            value={code}
            onChangeText={setCode}
            placeholder="NYERI-RIDGE-A"
          />
          <Text style={styles.helper}>
            Join only if you are enrolling a participating apartment. Pledges do not guarantee service until DRS clears
            capacity and switching proof. No payment fields on this step (ADR 0003).
          </Text>
        </GlassCard>
      ) : (
        <GlassCard>
          <TextField label="Building name" value={buildingName} onChangeText={setBuildingName} placeholder="Riverside Apartments" />
          <TextField
            label="Manual address fallback"
            value={address}
            onChangeText={setAddress}
            onBlur={geocodeAddress}
            placeholder="Street, town, country"
            multiline
          />
          {geocode ? <Text style={styles.success}>Geocoded: {geocode.formattedAddress}</Text> : null}
          <Text style={styles.helper}>
            If e.mappa cannot find an active project, we store your demand signal for owner outreach — still no money charged
            in pilot.
          </Text>
        </GlassCard>
      )}

      <StatusText status={geocodeError} tone="error" />
      <StatusText status={error} tone="error" />
    </OnboardShell>
  );
}
