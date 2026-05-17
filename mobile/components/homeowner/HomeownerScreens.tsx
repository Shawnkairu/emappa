import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type DimensionValue,
  type ViewStyle,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { DrsResult, PrepaidCommitment, User, WalletTransaction } from "@emappa/shared";
import { colors, Label, Pill, PrimaryButton, typography } from "@emappa/ui";
import { useAuth } from "../AuthContext";
import { PilotBanner } from "../PilotBanner";
import { ProjectHero } from "../ProjectHero";
import { ProfileEssentials } from "../ProfileEssentials";
import {
  BlockerPill,
  CashflowLedger,
  DeploymentProgressBar,
  DRSProgressCard,
  GenerationPanel,
  OwnershipPositionCard,
  OwnershipRingChart,
  TokenBalanceHero,
  type DeploymentPhase,
} from "../shared";
import {
  canRetraceRoof,
  homeownerSiteEvidencePhotos,
  photoStatusLabel,
  photoStatusTone,
  retraceDetail,
  retraceHref,
  roofConfidenceLabel,
  roofConfidenceTone,
  roofSourceLabel,
  roofSourceTone,
  type SiteEvidencePhoto,
} from "./homeownerProfileLogic";
import {
  homeownerCashflowTransactions,
  homeownerShareEarningsKes,
  homeownerSavingsOffsetKes,
  pledgeStatusTone,
  toCashflowLedgerRows,
} from "./homeownerWalletLogic";
import { ConsumptionTimeline } from "./ConsumptionTimeline";
import { homeownerOwnershipSegments } from "./homeownerOwnershipSegments";
import { homeownerSizingWarnings } from "./homeownerSizingWarnings";
import { SizingWarningList } from "./SizingWarningList";
import { SystemSizingExplainer } from "./SystemSizingExplainer";
import { SystemEnergyImmersiveHero } from "../energy/SystemImmersiveOverview";
import { readPilotSession } from "../session";
import { useApi } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";

type ApiStage = "listed" | "qualifying" | "funding" | "installing" | "live" | "retired";

interface ApiBuilding {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lon?: number;
  unitCount: number;
  occupancy: number | null;
  kind: "apartment" | "single_family";
  stage: ApiStage;
  roofAreaM2?: number | null;
  roofPolygonGeojson?: unknown;
  roofSource?: "microsoft_footprints" | "owner_traced" | "owner_typed" | null;
  roofConfidence?: number | null;
  dataSource?: "synthetic" | "measured" | "mixed";
  prepaidCommittedKes?: number;
}

interface RoleHome {
  role: "homeowner";
  primary: ApiBuilding | null;
  projects: ApiBuilding[];
  activity: string[];
}

interface EnergyToday {
  generation_kwh: number[];
  load_kwh: number[];
  irradiance_w_m2: number[];
}

interface PrepaidBalance {
  confirmedTotalKes: number;
}

interface WalletBalance {
  kes: number;
  breakdown: Record<string, number>;
}

interface SettlementPeriod {
  id: string;
  eGen: number;
  eSold: number;
  eWaste: number;
  revenueKes: number;
  payouts: Record<string, number>;
  dataSource: "synthetic" | "measured" | "mixed";
}

interface OwnershipPosition {
  percentage?: number;
  shareFraction?: number;
  ownerRole?: string;
  ownerId?: string;
}

interface HomeownerSnapshot {
  user: User;
  building: ApiBuilding | null;
  balance: PrepaidBalance | null;
  pledgeHistory: PrepaidCommitment[];
  energy: EnergyToday | null;
  drs: DrsResult | null;
  walletBalance: WalletBalance | null;
  transactions: WalletTransaction[];
  ownership: OwnershipPosition[];
  settlement: SettlementPeriod | null;
}

type EmbeddedKind = "drs" | "deployment" | "approve-terms" | "compare-today" | "roof-detail" | "marketplace";

type WalletSegment = "cashflow" | "ownership" | "pledges";

export function HomeownerHomeScreen() {
  const { data, error, isLoading, refetch } = useHomeownerSnapshot();
  const router = useRouter();

  return (
    <HomeownerShell title="Home" subtitle="Project readiness and live solar wallet, gated by deployment stage.">
      <SnapshotState data={data} error={error} isLoading={isLoading} refetch={refetch}>
        {(snapshot) => {
          if (!snapshot.building) {
            return (
              <EmptyCard
                icon="home-outline"
                title="Add your roof"
                body="Create a home record before roof review can begin."
                actionLabel="Start"
                onAction={() => router.push("/(homeowner)/_embedded/start-project")}
              />
            );
          }

          const isLive = snapshot.building.stage === "live";
          const readiness = readinessLabel(snapshot.drs);
          const blockers = snapshot.drs?.reasons ?? [];
          const permission = roofPermissionLabel(snapshot.building);
          const nextAction = nextHomeownerAction(snapshot.building, snapshot.drs);
          const kesBalance = snapshot.balance?.confirmedTotalKes ?? 0;
          const generation = sum(snapshot.energy?.generation_kwh);
          const load = sum(snapshot.energy?.load_kwh);
          const solarToday = Math.min(generation, load);
          const coverage = load > 0 ? solarToday / load : 0;
          const deployment = deploymentProgress(snapshot.building.stage);

          return (
            <>
              <PilotBanner compact />

              {isLive ? (
                <>
                  <TokenBalanceHero
                    eyebrow="Home solar wallet"
                    title="Pledged token balance"
                    subtitle={`Today's solar coverage ${formatPercent(coverage)} · ${formatKwh(solarToday)} matched to home load.`}
                    kesValue={formatKes(kesBalance)}
                    kwhLabel="Today's solar"
                    kwhValue={formatKwh(solarToday)}
                  />
                  <ProjectHero
                    name={snapshot.building.name}
                    location={snapshot.building.address}
                    readinessLabel={readiness}
                    summary={`${formatStage(snapshot.building.stage)} · ${permission} · DRS and deployment retrospective.`}
                  />
                </>
              ) : (
                <>
                  <View style={styles.heroStack}>
                    <ProjectHero
                      name={snapshot.building.name}
                      location={snapshot.building.address}
                      readinessLabel={readiness}
                      summary="Cooking up your energy project — funding, supplier lock, and go-live stay gated until readiness clears."
                    />
                    {snapshot.drs ? <DRSProgressCard drs={snapshot.drs} /> : null}
                    <WhiteCard>
                      <DeploymentProgressBar
                        label="Deployment path"
                        phases={deployment.phases}
                        percent={deployment.percent}
                      />
                      {blockers.length > 0 ? (
                        <View style={styles.blockerStack}>
                          {blockers.slice(0, 3).map((reason) => (
                            <BlockerPill key={reason} label={reason} severity="warning" />
                          ))}
                        </View>
                      ) : null}
                    </WhiteCard>
                  </View>
                  <TokenBalanceHero
                    title="Tokens activate once your project goes live"
                    subtitle="Pledge wallet and solar allocation unlock only after physical go-live."
                    disabled
                  />
                </>
              )}

              <MetricGrid
                metrics={[
                  { label: "Readiness", value: readiness, detail: blockers[0] ?? "No blocker reported" },
                  { label: "Status", value: formatStage(snapshot.building.stage), detail: isLive ? "Live and connected" : "Pre-live project path" },
                  { label: "Permission", value: permission, detail: "Roof access record" },
                  { label: "Next", value: nextAction.label, detail: nextAction.detail },
                ]}
              />

              <ActionRail
                actions={
                  isLive
                    ? [
                        ["Pledge", "/(homeowner)/wallet"],
                        ["View energy", "/(homeowner)/energy"],
                        ["Wallet", "/(homeowner)/wallet"],
                        ["Roof detail", "/(homeowner)/_embedded/roof-detail"],
                        ["Profile", "/(homeowner)/profile"],
                      ]
                    : [
                        ["View blockers", "/(homeowner)/_embedded/drs"],
                        ["Approve terms", "/(homeowner)/_embedded/approve-terms"],
                        ["Compare bill", "/(homeowner)/_embedded/compare-today"],
                        ["Timeline", "/(homeowner)/_embedded/deployment"],
                        ["Roof detail", "/(homeowner)/_embedded/roof-detail"],
                      ]
                }
              />
            </>
          );
        }}
      </SnapshotState>
    </HomeownerShell>
  );
}

export function HomeownerEnergyScreen() {
  const { data, error, isLoading, refetch } = useHomeownerSnapshot();
  const router = useRouter();

  return (
    <HomeownerShell title="Energy" subtitle="Usage, generation, and rooftop economics." immersive>
      <SnapshotState data={data} error={error} isLoading={isLoading} refetch={refetch}>
        {(snapshot) => {
          if (!snapshot.building) {
            return <NoBuildingCard />;
          }

          const isLive = snapshot.building.stage === "live";
          const generation = sum(snapshot.energy?.generation_kwh);
          const load = sum(snapshot.energy?.load_kwh);
          const sold = Math.min(generation, load);
          const coverage = load > 0 ? sold / load : 0;
          const genSeries = snapshot.energy?.generation_kwh ?? [];
          const loadSeries = snapshot.energy?.load_kwh ?? [];
          const utilization = snapshot.drs ? drsScore(snapshot.drs) / 100 : 0.55;
          const peakGen = genSeries.length ? Math.max(...genSeries) : 0;
          const peakLoad = loadSeries.length ? Math.max(...loadSeries) : 0;
          const batteryStatus = peakGen > peakLoad * 1.08 ? "charging" : peakLoad > peakGen * 1.08 ? "discharging" : "idle";
          const savingsKesToday = Math.round(sold * 10);
          const ownedShare = ownershipPercent(snapshot.ownership);
          const ownershipSegments = homeownerOwnershipSegments(snapshot.ownership, ownedShare);
          const syntheticMode = snapshot.building.dataSource === "mixed" ? "mixed" : "projected";
          const periodGeneration = snapshot.settlement?.eGen ?? generation * 30;
          const periodSold = snapshot.settlement?.eSold ?? sold * 30;
          const periodCoverage = periodGeneration > 0 ? periodSold / periodGeneration : coverage;
          const tokenBurnKes = snapshot.balance?.confirmedTotalKes
            ? Math.max(0, snapshot.balance.confirmedTotalKes - (snapshot.walletBalance?.kes ?? 0))
            : undefined;
          const sizingWarnings = homeownerSizingWarnings({
            generationKwh: generation,
            loadKwh: load,
            isLive,
            eGen: snapshot.settlement?.eGen,
            eSold: snapshot.settlement?.eSold,
            eWaste: snapshot.settlement?.eWaste,
          });
          const arrayKw = snapshot.building.roofAreaM2 ? Math.min(12, snapshot.building.roofAreaM2 * 0.12) : undefined;
          const batteryKwh = arrayKw ? arrayKw * 2.2 : undefined;

          return (
            <>
              <PilotBanner compact />
              <View style={{ marginHorizontal: -20, marginTop: -8 }}>
                <SystemEnergyImmersiveHero
                  siteName={snapshot.building.name}
                  weatherHint={isLive ? "Live · building feed" : "Pre-live · projected"}
                  generationKwhToday={generation}
                  loadKwhToday={load}
                  generationHourly={genSeries.length ? genSeries : [generation / 24]}
                  loadHourly={loadSeries.length ? loadSeries : [load / 24]}
                  batterySoc={Math.min(0.96, Math.max(0.1, 0.2 + utilization * 0.65))}
                  batteryStatus={batteryStatus}
                  savingsKesLabel={formatKes(savingsKesToday)}
                  summaryCards={[
                    { label: "Used today", value: formatKwh(load), hint: "Household", icon: "home-outline" },
                    { label: "Produced", value: formatKwh(generation), hint: "Roof path", icon: "sunny-outline" },
                    { label: "Matched", value: formatPercent(coverage), hint: "Solar-first", icon: "pulse-outline" },
                  ]}
                />
              </View>

              <EnergyFlowCard generation={generation} load={load} source={snapshot.building.dataSource ?? "unreported"} />

              <GenerationPanel
                todayKwh={generation}
                periodKwh={periodGeneration}
                retainedSharePct={ownedShare}
                hourlyGeneration={genSeries}
                syntheticMode={syntheticMode}
                alwaysVisible
                onOwnershipPress={
                  ownershipSegments
                    ? () => router.push("/(homeowner)/_embedded/marketplace")
                    : undefined
                }
              />

              {ownershipSegments ? (
                <WhiteCard>
                  <Label>Share split</Label>
                  <OwnershipRingChart
                    segments={ownershipSegments}
                    centerLabel="You retain"
                    centerValue={formatPercent(ownedShare)}
                  />
                  <Pressable accessibilityRole="button" onPress={() => router.push("/(homeowner)/_embedded/marketplace")}>
                    <Text style={styles.linkText}>Ownership & buy-back</Text>
                  </Pressable>
                </WhiteCard>
              ) : null}

              <SystemSizingExplainer
                arrayKw={arrayKw}
                batteryKwh={batteryKwh}
                dailyLoadKwh={load}
                roofAreaM2={snapshot.building.roofAreaM2}
              />

              <ConsumptionTimeline
                daily={{ kwh: load, savingsKes: savingsKesToday, coverage, tokenBurnKes }}
                weekly={{ kwh: load * 7, savingsKes: savingsKesToday * 7, coverage }}
                monthly={{
                  kwh: periodGeneration,
                  savingsKes: snapshot.settlement?.revenueKes ?? savingsKesToday * 30,
                  coverage: periodCoverage,
                  tokenBurnKes: tokenBurnKes ? tokenBurnKes * 4 : undefined,
                }}
              />

              <SizingWarningList warnings={sizingWarnings} />

              <WhiteCard>
                <Label>Truth</Label>
                <Text style={styles.cardTitle}>You control access to the roof.</Text>
                <Text style={styles.bodyText}>
                  The solar array is a provider asset. Income only follows monetized energy and settlement records — not
                  self-payment through your own pledge wallet.
                </Text>
              </WhiteCard>
            </>
          );
        }}
      </SnapshotState>
    </HomeownerShell>
  );
}

export function HomeownerWalletScreen() {
  const { data, error, isLoading, refetch } = useHomeownerSnapshot();
  const [segment, setSegment] = useState<WalletSegment>("cashflow");

  return (
    <HomeownerShell title="Wallet" subtitle="Three streams — pledges, zero host royalty on your roof, and external share earnings only.">
      <SnapshotState data={data} error={error} isLoading={isLoading} refetch={refetch}>
        {(snapshot) => {
          if (!snapshot.building) {
            return <NoBuildingCard />;
          }

          const isLive = snapshot.building.stage === "live";
          const generation = sum(snapshot.energy?.generation_kwh);
          const load = sum(snapshot.energy?.load_kwh);
          const pledgedKes = snapshot.balance?.confirmedTotalKes ?? 0;
          const savingsOffset = homeownerSavingsOffsetKes({
            generationKwh: generation,
            loadKwh: load,
            settlementSold: snapshot.settlement?.eSold,
          });
          const shareEarnings = homeownerShareEarningsKes(snapshot.transactions);
          const ownedShare = ownershipPercent(snapshot.ownership);
          const cashflowRows = toCashflowLedgerRows(snapshot.transactions);

          return (
            <>
              <PilotBanner compact />
              <WalletStreamsHero
                pledgedKes={pledgedKes}
                hostRoyaltyKes={0}
                savingsOffsetKes={savingsOffset}
                shareEarningsKes={shareEarnings}
                isLive={isLive}
              />

              <Segmented
                value={segment}
                options={[
                  ["cashflow", "Cashflow"],
                  ["ownership", "Ownership"],
                  ["pledges", "Pledges"],
                ]}
                onChange={setSegment}
              />

              {segment === "cashflow" ? (
                <>
                  <WhiteCard>
                    <Label>Cashflow</Label>
                    <Text style={styles.bodyText}>
                      Token spend and avoided grid cost stay separate from ownership payouts. Self-consumption is savings,
                      not cash you earned by paying yourself.
                    </Text>
                    <Row label="Wallet balance" value={formatKes(snapshot.walletBalance?.kes ?? 0)} note="Posted account balance" />
                    <Row label="Avoided grid cost" value={formatKes(savingsOffset)} note="Solar matched to home load — not host royalty" />
                  </WhiteCard>
                  {cashflowRows.length > 0 ? (
                    <WhiteCard>
                      <CashflowLedger
                        title="Chronological"
                        rows={cashflowRows}
                        footer="Host royalty lines are hidden on your own roof. Export, trading, and third-party use only create ownership cash."
                      />
                    </WhiteCard>
                  ) : (
                    <EmptyCard
                      icon="wallet-outline"
                      title="No cashflow rows yet"
                      body="Pledges, solar delivery savings, and external monetization appear here once settlement posts."
                    />
                  )}
                </>
              ) : null}

              {segment === "ownership" ? (
                <WalletOwnershipPanel
                  buildingName={snapshot.building.name}
                  ownedShare={ownedShare}
                  shareEarningsKes={shareEarnings}
                  settlement={snapshot.settlement}
                  positions={snapshot.ownership}
                />
              ) : null}

              {segment === "pledges" ? (
                <WalletPledgesPanel pledgedKes={pledgedKes} history={snapshot.pledgeHistory} isLive={isLive} />
              ) : null}
            </>
          );
        }}
      </SnapshotState>
    </HomeownerShell>
  );
}

function HomeownerPropertyRoofCard({
  building,
  router,
}: {
  building: ApiBuilding;
  router: ReturnType<typeof useRouter>;
}) {
  const source = building.roofSource;
  const showRetrace = canRetraceRoof(source);

  return (
    <WhiteCard>
      <Label>Property & roof</Label>
      <Text style={styles.cardTitle}>{building.name}</Text>
      <Text style={styles.bodyText}>{building.address}</Text>
      <View style={styles.roofBadgeRow}>
        <Pill tone={roofSourceTone(source)}>{roofSourceLabel(source)}</Pill>
        <Pill tone={roofConfidenceTone(building.roofConfidence)}>{roofConfidenceLabel(building.roofConfidence)}</Pill>
      </View>
      <MiniRoofGraphic area={building.roofAreaM2} />
      <InfoRows
        rows={[
          ["Kind", building.kind.replace("_", " ")],
          ["Roof record", formatArea(building.roofAreaM2)],
          ["Stage", formatStage(building.stage)],
        ]}
      />
      <View style={styles.profileActionStack}>
        {showRetrace ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retrace roof on satellite map"
            onPress={() => router.push(retraceHref(building) as never)}
            style={styles.secondaryAction}
          >
            <Ionicons name="scan-outline" color={colors.orangeDeep} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.secondaryActionTitle}>Retrace roof</Text>
              <Text style={styles.secondaryActionNote}>{retraceDetail(source)}</Text>
            </View>
            <Ionicons name="chevron-forward" color={colors.muted} size={18} />
          </Pressable>
        ) : null}
        <PrimaryButton onPress={() => router.push("/(homeowner)/_embedded/roof-detail")}>Review polygon</PrimaryButton>
      </View>
    </WhiteCard>
  );
}

function SiteEvidencePhotoGrid({ photos }: { photos: SiteEvidencePhoto[] }) {
  const dbPhotos = photos.filter((photo) => photo.group === "db");
  const meterPhotos = photos.filter((photo) => photo.group === "meter");

  return (
    <WhiteCard>
      <Label>Site evidence</Label>
      <Text style={styles.bodyText}>Distribution board and utility meter photos gate electrician scheduling and LBRS.</Text>
      <PhotoEvidenceSection title="DB photos" photos={dbPhotos} />
      <PhotoEvidenceSection title="Meter photos" photos={meterPhotos} />
    </WhiteCard>
  );
}

function PhotoEvidenceSection({ title, photos }: { title: string; photos: SiteEvidencePhoto[] }) {
  return (
    <View style={styles.photoSection}>
      <Text style={styles.photoSectionTitle}>{title}</Text>
      <View style={styles.photoGrid}>
        {photos.map((photo) => (
          <View key={photo.id} style={styles.photoTile}>
            <View style={styles.photoThumb}>
              <Ionicons
                name={photo.group === "db" ? "flash-outline" : "speedometer-outline"}
                color={colors.orangeDeep}
                size={22}
              />
            </View>
            <Text style={styles.photoLabel}>{photo.label}</Text>
            <Pill tone={photoStatusTone(photo.status)}>{photoStatusLabel(photo.status)}</Pill>
            <Text style={styles.photoDetail}>{photo.detail}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function HomeownerProfileScreen() {
  const { data, error, isLoading, refetch } = useHomeownerSnapshot();
  const { clearSession } = useAuth();
  const router = useRouter();

  function logout() {
    clearSession();
    router.replace("/(auth)/login");
  }

  return (
    <HomeownerShell title="Profile" subtitle="Home, trust, support.">
      <SnapshotState data={data} error={error} isLoading={isLoading} refetch={refetch}>
        {(snapshot) => {
          const initials = initialsFor(snapshot.user);
          return (
            <>
              <WhiteCard>
                <View style={styles.profileHero}>
                  <View style={styles.avatarLarge}>
                    <Text style={styles.avatarTextLarge}>{initials}</Text>
                  </View>
                  <Text style={styles.profileName}>{snapshot.user.displayName ?? "Homeowner"}</Text>
                  <Text style={styles.profileEmail}>{snapshot.user.email}</Text>
                  <View style={styles.pillRow}>
                    <Pill>Roof host</Pill>
                    <Pill>Verified account</Pill>
                  </View>
                </View>
              </WhiteCard>

              {snapshot.building ? (
                <HomeownerPropertyRoofCard building={snapshot.building} router={router} />
              ) : (
                <NoBuildingCard />
              )}

              {snapshot.building ? (
                <SiteEvidencePhotoGrid photos={homeownerSiteEvidencePhotos(snapshot.building)} />
              ) : null}

              <WhiteCard>
                <Label>Trust</Label>
                <InfoRows
                  rows={[
                    ["Identity", "Account email on file"],
                    ["Permission", snapshot.building ? roofPermissionLabel(snapshot.building) : "No roof"],
                    ["Updates", "Readiness and settlements"],
                  ]}
                />
              </WhiteCard>

              <ProfileEssentials
                roleLabel="Homeowner"
                accountRows={[
                  { label: "Property", value: snapshot.building?.name ?? "No home attached", note: snapshot.building?.address ?? "submit a property first" },
                ]}
                supportSubject={`Homeowner support - ${snapshot.building?.name ?? "property"}`}
              />

              <WhiteCard>
                <Label>Support</Label>
                <Text style={styles.bodyText}>Get help with roof records or income questions.</Text>
                <PrimaryButton onPress={() => Linking.openURL("mailto:support@emappa.test?subject=Homeowner%20support")}>
                  Contact support
                </PrimaryButton>
              </WhiteCard>

              <Pressable onPress={logout} style={styles.logoutButton}>
                <Text style={styles.logoutText}>Log out</Text>
              </Pressable>
            </>
          );
        }}
      </SnapshotState>
    </HomeownerShell>
  );
}

export function HomeownerEmbeddedScreen({ kind }: { kind: EmbeddedKind }) {
  const { data, error, isLoading, refetch } = useHomeownerSnapshot();
  const titleByKind: Record<EmbeddedKind, string> = {
    drs: "Readiness",
    deployment: "Deployment",
    "approve-terms": "Terms",
    "compare-today": "Compare",
    "roof-detail": "Roof",
    marketplace: "Shares",
  };

  return (
    <HomeownerShell title={titleByKind[kind]} subtitle="Homeowner roof record.">
      <SnapshotState data={data} error={error} isLoading={isLoading} refetch={refetch}>
        {(snapshot) => {
          if (!snapshot.building) {
            return <NoBuildingCard />;
          }
          if (kind === "drs") {
            return <DrsDetail snapshot={snapshot} />;
          }
          if (kind === "deployment") {
            return <DeploymentDetail building={snapshot.building} drs={snapshot.drs} />;
          }
          if (kind === "approve-terms") {
            return <TermsDetail snapshot={snapshot} />;
          }
          if (kind === "compare-today") {
            return <CompareTodayDetail snapshot={snapshot} />;
          }
          if (kind === "roof-detail") {
            return <RoofDetail snapshot={snapshot} refetch={refetch} />;
          }
          return <MarketplaceDetail snapshot={snapshot} />;
        }}
      </SnapshotState>
    </HomeownerShell>
  );
}

export function HomeownerStartProjectScreen() {
  const api = useApi();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  async function createProject() {
    const parsedLat = Number(lat);
    const parsedLon = Number(lon);
    if (!name.trim() || !address.trim() || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) {
      setStatus("Add a name, address, latitude, and longitude to create the project.");
      return;
    }

    setStatus("Creating project...");
    await api.createBuilding({
      name: name.trim(),
      address: address.trim(),
      lat: parsedLat,
      lon: parsedLon,
      unitCount: 1,
      occupancy: 1,
      kind: "single_family",
    });
    router.replace("/(homeowner)/home");
  }

  return (
    <HomeownerShell title="Start" subtitle="Add the roof you control.">
      <WhiteCard>
        <IconBadge name="home-outline" />
        <Text style={styles.cardTitle}>Home details</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Project name" placeholderTextColor={colors.dim} style={styles.input} />
        <TextInput value={address} onChangeText={setAddress} placeholder="Address" placeholderTextColor={colors.dim} style={styles.input} />
        <TextInput value={lat} onChangeText={setLat} placeholder="Latitude" placeholderTextColor={colors.dim} keyboardType="decimal-pad" style={styles.input} />
        <TextInput value={lon} onChangeText={setLon} placeholder="Longitude" placeholderTextColor={colors.dim} keyboardType="decimal-pad" style={styles.input} />
        {status ? <Text style={styles.bodyText}>{status}</Text> : null}
        <PrimaryButton onPress={createProject}>Create</PrimaryButton>
      </WhiteCard>
    </HomeownerShell>
  );
}

export function HomeownerGuard({ children }: { children: ReactNode }) {
  const session = readPilotSession();
  if (session?.role && session.role !== "homeowner") {
    return <Redirect href="/(auth)/role-select" />;
  }
  return children;
}

function useHomeownerSnapshot() {
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;
  const load = useCallback(() => loadHomeownerSnapshot(apiRef.current), []);
  return useApiData(load, []);
}

async function loadHomeownerSnapshot(api: ReturnType<typeof useApi>): Promise<HomeownerSnapshot> {
  const [user, homeResult] = await Promise.all([api.me(), api.roleHome("homeowner")]);
  const home = homeResult as unknown as RoleHome;
  const building =
    home.primary ?? (user.buildingId ? ((await api.getProject(user.buildingId)) as unknown as ApiBuilding) : null);

  if (!building) {
    return {
      user,
      building: null,
      balance: null,
      pledgeHistory: [],
      energy: null,
      drs: null,
      walletBalance: null,
      transactions: [],
      ownership: [],
      settlement: null,
    };
  }

  const [balance, pledgeHistory, energy, drs, walletBalance, transactions, ownership, settlement] = await Promise.all([
    api.getPrepaidBalance(building.id),
    api.getPrepaidHistory(building.id),
    api.getEnergyToday(building.id),
    api.getDrsAssessment(building.id) as Promise<DrsResult>,
    api.getWalletBalance(user.id),
    api.getWalletTransactions(user.id),
    api.getOwnership(building.id, "homeowner") as Promise<OwnershipPosition[]>,
    api.getLatestSettlement(building.id) as Promise<SettlementPeriod | null>,
  ]);

  return { user, building, balance, pledgeHistory, energy, drs, walletBalance, transactions, ownership, settlement };
}

function SnapshotState({
  data,
  error,
  isLoading,
  refetch,
  children,
}: {
  data: HomeownerSnapshot | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => void;
  children: (snapshot: HomeownerSnapshot) => ReactNode;
}) {
  if (isLoading) {
    return <LoadingCard />;
  }
  if (error) {
    return <ErrorCard message={error.message} onRetry={refetch} />;
  }
  if (!data) {
    return <ErrorCard message="No homeowner data was returned." onRetry={refetch} />;
  }
  return <>{children(data)}</>;
}

function HomeownerShell({
  title,
  subtitle,
  children,
  immersive = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  immersive?: boolean;
}) {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {immersive ? null : (
            <>
              <Text style={styles.kicker}>Homeowner</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </>
          )}
          <View style={styles.stack}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ActionRail({ actions }: { actions: Array<[string, string]> }) {
  const router = useRouter();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRail}>
      {actions.map(([label, href]) => (
        <Pressable key={label} onPress={() => router.push(href)} style={styles.actionPill}>
          <Text style={styles.actionText}>{label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function MetricGrid({ metrics }: { metrics: Array<{ label: string; value: string; detail: string }> }) {
  return (
    <View style={styles.metricGrid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metricItem}>
          <WhiteCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricDetail}>{metric.detail}</Text>
          </WhiteCard>
        </View>
      ))}
    </View>
  );
}

function Segmented<TValue extends string>({
  value,
  options,
  onChange,
}: {
  value: TValue;
  options: Array<[TValue, string]>;
  onChange: (next: TValue) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map(([next, label]) => {
        const selected = value === next;
        return (
          <Pressable key={next} onPress={() => onChange(next)} style={[styles.segment, selected && styles.segmentSelected]}>
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function WalletStreamsHero({
  pledgedKes,
  hostRoyaltyKes,
  savingsOffsetKes,
  shareEarningsKes,
  isLive,
}: {
  pledgedKes: number;
  hostRoyaltyKes: number;
  savingsOffsetKes: number;
  shareEarningsKes: number;
  isLive: boolean;
}) {
  return (
    <MetricGrid
      metrics={[
        {
          label: "Pledged total",
          value: formatKes(pledgedKes),
          detail: isLive ? "Project contributions · tokens on home path" : "Pre-live · activates at go-live",
        },
        {
          label: "Host royalty",
          value: formatKes(hostRoyaltyKes),
          detail: "Zero on your own roof",
        },
        {
          label: "Share / external",
          value: formatKes(shareEarningsKes),
          detail: `Savings offset ${formatKes(savingsOffsetKes)} shown in cashflow`,
        },
      ]}
    />
  );
}

function WalletOwnershipPanel({
  buildingName,
  ownedShare,
  shareEarningsKes,
  settlement,
  positions,
}: {
  buildingName: string;
  ownedShare: number;
  shareEarningsKes: number;
  settlement: SettlementPeriod | null;
  positions: OwnershipPosition[];
}) {
  const router = useRouter();
  const retainedPct = Math.round(ownedShare * 1000) / 10;
  const externalOnly = settlement?.revenueKes ? Math.round(settlement.revenueKes * Math.max(0, 1 - ownedShare)) : undefined;

  return (
    <>
      <OwnershipPositionCard
        title={buildingName}
        sharePct={retainedPct}
        valueKes={externalOnly !== undefined ? formatKes(externalOnly) : undefined}
        poolLabel="Retained economics"
        detail="Payouts only from net metering, export credit, trading, or third-party consumption — never from your own token spend."
        buyBackAvailable={ownedShare < 1}
      />
      {positions.length > 0 ? (
        <WhiteCard>
          <Label>Positions</Label>
          {positions.map((position, index) => (
            <Row
              key={`${position.ownerId ?? "owner"}-${index}`}
              label={position.ownerRole ?? "cashflow"}
              value={formatPercent(positionShare(position))}
              note={position.ownerId ?? "Record id unavailable"}
            />
          ))}
        </WhiteCard>
      ) : null}
      <WhiteCard>
        <Label>External monetization</Label>
        <Row label="Settled share earnings" value={formatKes(shareEarningsKes)} note="capital_return rows only" />
        {ownedShare < 1 ? (
          <PrimaryButton onPress={() => router.push("/(homeowner)/_embedded/marketplace")}>Buy back shares</PrimaryButton>
        ) : null}
      </WhiteCard>
    </>
  );
}

function WalletPledgesPanel({
  pledgedKes,
  history,
  isLive,
}: {
  pledgedKes: number;
  history: PrepaidCommitment[];
  isLive: boolean;
}) {
  return (
    <>
      <TokenBalanceHero
        eyebrow="Pledge stream"
        title={isLive ? "Confirmed pledge balance" : "Pledges before go-live"}
        subtitle={isLive ? "Tokens unlock on your home path after go-live." : "Edit or cancel pledges until activation; no money moves at onboarding."}
        kesValue={formatKes(pledgedKes)}
        disabled={!isLive && pledgedKes === 0}
      />
      <WhiteCard>
        <Label>Pledge history</Label>
        {history.length === 0 ? (
          <Text style={styles.bodyText}>No pledges recorded yet.</Text>
        ) : (
          history.map((item) => (
            <View key={item.id} style={styles.pledgeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{formatKes(item.amountKes)}</Text>
                <Text style={styles.rowNote}>
                  {item.paymentMethod} · {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Pill tone={pledgeStatusTone(item.status)}>{item.status}</Pill>
            </View>
          ))
        )}
      </WhiteCard>
    </>
  );
}

function DrsDetail({ snapshot }: { snapshot: HomeownerSnapshot }) {
  if (!snapshot.drs) {
    return <EmptyCard icon="shield-checkmark-outline" title="No readiness yet" body="No DRS result was returned." />;
  }

  return (
    <WhiteCard>
      <IconBadge name="shield-checkmark-outline" />
      <Text style={styles.cardTitle}>{readinessLabel(snapshot.drs)}</Text>
      <Text style={styles.bodyText}>Readiness gates funding, scheduling, and go-live.</Text>
      {snapshot.drs.reasons.length === 0 ? (
        <Row label="Blockers" value="None" note="No DRS blocker was returned." />
      ) : (
        snapshot.drs.reasons.map((reason) => <Row key={reason} label={reason} value="Review" note="Resolve before go-live." />)
      )}
    </WhiteCard>
  );
}

function DeploymentDetail({ building, drs }: { building: ApiBuilding; drs: DrsResult | null }) {
  const stages: ApiStage[] = ["listed", "qualifying", "funding", "installing", "live"];
  const current = Math.max(0, stages.indexOf(building.stage));
  const progress = `${Math.max(8, ((current + 1) / stages.length) * 100)}%` as DimensionValue;

  return (
    <WhiteCard>
      <Label>Deployment timeline</Label>
      <Text style={styles.cardTitle}>{formatStage(building.stage)}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progress }]} />
      </View>
      {stages.map((stage, index) => (
        <Row
          key={stage}
          label={formatStage(stage)}
          value={index <= current ? "Reached" : "Pending"}
          note={stage === "live" ? "Go-live only follows readiness approval." : `DRS: ${readinessLabel(drs)}`}
        />
      ))}
    </WhiteCard>
  );
}

function TermsDetail({ snapshot }: { snapshot: HomeownerSnapshot }) {
  return (
    <WhiteCard>
      <Label>Terms</Label>
      <Text style={styles.cardTitle}>Roof permission rules</Text>
      <InfoRows
        rows={[
          ["Roof control", "You grant access; provider owns the array."],
          ["Readiness", "Funding and go-live stay gated."],
          ["Income", "Payout follows monetized energy only."],
          ["Current stage", formatStage(snapshot.building!.stage)],
        ]}
      />
    </WhiteCard>
  );
}

function CompareTodayDetail({ snapshot }: { snapshot: HomeownerSnapshot }) {
  const generation = sum(snapshot.energy?.generation_kwh);
  const load = sum(snapshot.energy?.load_kwh);
  const sold = Math.min(generation, load);

  return (
    <>
      <EnergyFlowCard generation={generation} load={load} source={snapshot.building?.dataSource ?? "unreported"} />
      <MetricGrid
        metrics={[
          { label: "Produced", value: formatKwh(generation), detail: "Provider system" },
          { label: "Matched", value: formatKwh(sold), detail: "Served home load" },
          { label: "Income", value: formatKes(snapshot.settlement?.payouts["homeowner"] ?? 0), detail: "Latest settlement" },
        ]}
      />
    </>
  );
}

function RoofDetail({ snapshot, refetch }: { snapshot: HomeownerSnapshot; refetch: () => void }) {
  const api = useApi();
  const [area, setArea] = useState(snapshot.building?.roofAreaM2 ? String(snapshot.building.roofAreaM2) : "");
  const [status, setStatus] = useState<string | null>(null);

  async function saveRoof() {
    const areaM2 = Number(area);
    if (!Number.isFinite(areaM2) || areaM2 <= 0) {
      setStatus("Enter a positive roof area before saving.");
      return;
    }
    setStatus("Saving roof evidence...");
    await api.setRoof(snapshot.building!.id, { areaM2, source: "owner_typed" });
    setStatus("Roof evidence saved. Refreshing...");
    refetch();
  }

  return (
    <WhiteCard>
      <Label>Roof detail</Label>
      <MiniRoofGraphic area={snapshot.building!.roofAreaM2} />
      <TextInput value={area} onChangeText={setArea} keyboardType="decimal-pad" placeholder="Usable roof area m2" placeholderTextColor={colors.dim} style={styles.input} />
      {status ? <Text style={styles.bodyText}>{status}</Text> : null}
      <PrimaryButton onPress={saveRoof}>Save roof area</PrimaryButton>
    </WhiteCard>
  );
}

function MarketplaceDetail({ snapshot }: { snapshot: HomeownerSnapshot }) {
  const ownedShare = ownershipPercent(snapshot.ownership);
  return (
    <WhiteCard>
      <Label>Cashflow shares</Label>
      <Text style={styles.cardTitle}>{formatPercent(Math.max(0, 1 - ownedShare))} outside homeowner record</Text>
      <Text style={styles.bodyText}>
        This is a payout record, not solar array ownership. Transfers need backend support.
      </Text>
      <PrimaryButton onPress={() => Linking.openURL("mailto:support@emappa.test?subject=Homeowner%20share%20buyback")}>
        Contact support
      </PrimaryButton>
    </WhiteCard>
  );
}

function InfoRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <View style={{ marginTop: 12 }}>
      {rows.map(([label, value]) => (
        <Row key={label} label={label} value={value} />
      ))}
    </View>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {note ? <Text style={styles.rowNote}>{note}</Text> : null}
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function LoadingCard() {
  return (
    <WhiteCard>
      <IconBadge name="sync-outline" />
      <Text style={styles.cardTitle}>Preparing homeowner data</Text>
      <Text style={styles.bodyText}>Fetching roof, energy, income, and readiness.</Text>
    </WhiteCard>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <WhiteCard>
      <IconBadge name="warning-outline" />
      <Text style={styles.cardTitle}>Homeowner data unavailable</Text>
      <Text style={styles.bodyText}>{message}</Text>
      <PrimaryButton onPress={onRetry}>Retry</PrimaryButton>
    </WhiteCard>
  );
}

function EmptyCard({
  icon = "home-outline",
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <WhiteCard>
      <IconBadge name={icon} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.bodyText}>{body}</Text>
      {actionLabel && onAction ? <PrimaryButton onPress={onAction}>{actionLabel}</PrimaryButton> : null}
    </WhiteCard>
  );
}

function NoBuildingCard() {
  const router = useRouter();
  return (
    <EmptyCard
      icon="home-outline"
      title="No roof yet"
      body="Add a home before this screen can load."
      actionLabel="Start"
      onAction={() => router.push("/(homeowner)/_embedded/start-project")}
    />
  );
}

function WhiteCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.whiteCard, style]}>{children}</View>;
}

function IconBadge({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.iconBadge}>
      <Ionicons name={name} color={colors.orangeDeep} size={20} />
    </View>
  );
}

function RoofStatusHero({ building, readiness, permission }: { building: ApiBuilding; readiness: string; permission: string }) {
  return (
    <WhiteCard style={styles.heroCard}>
      <View style={styles.heroTopRow}>
        <View style={{ flex: 1 }}>
          <Label>Roof host</Label>
          <Text style={styles.heroTitle}>{building.name}</Text>
          <Text style={styles.heroSub}>{building.address}</Text>
        </View>
        <IconBadge name="home-outline" />
      </View>
      <MiniRoofGraphic area={building.roofAreaM2} />
      <View style={styles.heroStatusRow}>
        <Pill>{permission}</Pill>
        <Text style={styles.heroStatusText}>{readiness}</Text>
      </View>
    </WhiteCard>
  );
}

function MiniRoofGraphic({ area }: { area?: number | null }) {
  return (
    <View style={styles.roofGraphic}>
      <View style={styles.roofPeak} />
      <View style={styles.roofBase}>
        <View style={styles.roofLine} />
        <View style={[styles.roofLine, styles.roofLineShort]} />
      </View>
      <Text style={styles.roofArea}>{formatArea(area)}</Text>
    </View>
  );
}

function EnergyFlowCard({ generation, load, source }: { generation: number; load: number; source: string }) {
  const matched = Math.min(generation, load);
  const ratio = generation > 0 ? matched / generation : 0;
  const width = `${Math.max(8, ratio * 100)}%` as DimensionValue;

  return (
    <WhiteCard style={styles.heroCard}>
      <View style={styles.energyHeader}>
        <Label>Today</Label>
        <Text style={styles.energySource}>Source: {source}</Text>
      </View>
      <View style={styles.flowRow}>
        <FlowNode icon="hardware-chip-outline" label="Provider array" />
        <View style={styles.flowLine}>
          <View style={[styles.flowLineFill, { width }]} />
        </View>
        <FlowNode icon="home-outline" label="Your roof" />
        <View style={styles.flowLine}>
          <View style={[styles.flowLineFill, { width }]} />
        </View>
        <FlowNode icon="bulb-outline" label="Home use" />
      </View>
      <View style={styles.energyTotals}>
        <Text style={styles.energyNumber}>{formatKwh(generation)}</Text>
        <Text style={styles.energyCaption}>produced on the roof</Text>
      </View>
    </WhiteCard>
  );
}

function FlowNode({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.flowNode}>
      <Ionicons name={icon} color={colors.orangeDeep} size={18} />
      <Text style={styles.flowLabel}>{label}</Text>
    </View>
  );
}

function sum(values: number[] | null | undefined) {
  return values?.reduce((total, value) => total + value, 0) ?? 0;
}

function formatKes(value: number) {
  return `KSh ${Math.round(value).toLocaleString()}`;
}

function formatKwh(value: number) {
  return `${Number(value.toFixed(1)).toLocaleString()} kWh`;
}

function formatPercent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function formatArea(value?: number | null) {
  return value ? `${Math.round(value).toLocaleString()} m2` : "Not captured";
}

function deploymentProgress(stage: ApiStage) {
  const stages: ApiStage[] = ["listed", "qualifying", "funding", "installing", "live"];
  const current = Math.max(0, stages.indexOf(stage));
  const percent = Math.round(((current + 1) / stages.length) * 100);
  const phaseLabels = ["Qualifying", "Funding", "Installing", "Live"] as const;
  const phases: DeploymentPhase[] = phaseLabels.map((label, index) => {
    const phaseIndex = index + 1;
    return {
      key: label.toLowerCase(),
      label,
      complete: current > phaseIndex,
      current: current === phaseIndex,
    };
  });
  return { percent, phases };
}

function formatStage(stage: string) {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Date unavailable";
}

function roofPermissionLabel(building: ApiBuilding) {
  if (building.roofAreaM2 && building.roofAreaM2 > 0) {
    return "Permission ready";
  }
  return "Needs roof area";
}

function nextHomeownerAction(building: ApiBuilding, drs: DrsResult | null) {
  if (!building.roofAreaM2 || building.roofAreaM2 <= 0) {
    return { label: "Add roof area", detail: "Capture usable space" };
  }
  if (!drs || drs.reasons.length > 0) {
    return { label: "Clear readiness", detail: drs?.reasons[0] ?? "Awaiting assessment" };
  }
  if (building.stage !== "live") {
    return { label: "Approve access", detail: "Wait for go-live gates" };
  }
  return { label: "Monitor", detail: "Roof flow is live" };
}

function readinessLabel(drs: DrsResult | null) {
  if (!drs) {
    return "DRS unavailable";
  }
  return `${drs.decision} · ${drsScore(drs)}/100`;
}

function drsScore(drs: DrsResult) {
  return drs.score <= 1 ? Math.round(drs.score * 100) : Math.round(drs.score);
}

function ownershipPercent(positions: OwnershipPosition[]) {
  return Math.min(1, positions.reduce((total, position) => total + positionShare(position), 0));
}

function positionShare(position: OwnershipPosition) {
  if (typeof position.shareFraction === "number") {
    return position.shareFraction;
  }
  if (typeof position.percentage === "number") {
    return position.percentage > 1 ? position.percentage / 100 : position.percentage;
  }
  return 0;
}

function initialsFor(user: User) {
  const source = user.displayName ?? user.email;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 },
  kicker: {
    color: colors.orangeDeep,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: typography.hero + 8,
    fontWeight: "800",
    letterSpacing: -1.1,
    lineHeight: typography.hero + 14,
    marginTop: 8,
  },
  subtitle: { color: colors.muted, fontSize: typography.body, lineHeight: 22, marginTop: 4 },
  stack: { gap: 16, marginTop: 18 },
  heroStack: { gap: 14 },
  blockerStack: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  actionRail: { gap: 8, paddingVertical: 2 },
  actionPill: {
    borderColor: `${colors.orangeDeep}40`,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionText: { color: colors.orangeDeep, fontSize: 12, fontWeight: "800" },
  linkText: { color: colors.orangeDeep, fontSize: typography.small, fontWeight: "800", marginTop: 4 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricItem: { width: "48%" },
  metricCard: { minHeight: 118, padding: 14 },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.7, textTransform: "uppercase" },
  metricValue: { color: colors.text, fontSize: 19, fontWeight: "800", letterSpacing: -0.45, marginTop: 8 },
  metricDetail: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  whiteCard: {
    gap: 10,
    borderColor: "rgba(150, 90, 53, 0.14)",
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: colors.white,
    padding: 16,
    boxShadow: "0 8px 16px rgba(87, 54, 27, 0.06)",
    elevation: 2,
  },
  heroCard: { padding: 18 },
  heroTopRow: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: 14 },
  heroTitle: { color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.9, lineHeight: 34, marginTop: 6 },
  heroSub: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  heroStatusRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 6 },
  heroStatusText: { color: colors.text, flex: 1, fontSize: 12, fontWeight: "800", textAlign: "right" },
  iconBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: `${colors.orangeDeep}12`,
    borderColor: `${colors.orangeDeep}25`,
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  roofGraphic: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 132,
    padding: 18,
  },
  roofPeak: {
    width: 0,
    height: 0,
    borderLeftWidth: 64,
    borderRightWidth: 64,
    borderBottomWidth: 44,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: `${colors.orangeDeep}22`,
  },
  roofBase: {
    alignItems: "center",
    backgroundColor: `${colors.orangeDeep}10`,
    borderColor: `${colors.orangeDeep}55`,
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    marginTop: -2,
    width: 132,
  },
  roofLine: { backgroundColor: colors.orangeDeep, borderRadius: 999, height: 3, width: 78 },
  roofLineShort: { opacity: 0.5, marginTop: 8, width: 48 },
  roofArea: { color: colors.text, fontSize: 12, fontWeight: "800", marginTop: 10 },
  energyHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  energySource: { color: colors.dim, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  flowRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 12 },
  flowLine: { flex: 1, height: 4, borderRadius: 999, backgroundColor: `${colors.orangeDeep}18`, overflow: "hidden" },
  flowLineFill: { height: 4, borderRadius: 999, backgroundColor: colors.orangeDeep },
  flowNode: { alignItems: "center", gap: 5, width: 68 },
  flowLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", lineHeight: 13, textAlign: "center" },
  energyTotals: { alignItems: "center", backgroundColor: `${colors.orangeDeep}0D`, borderRadius: 22, marginTop: 18, paddingVertical: 18 },
  energyNumber: { color: colors.text, fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  energyCaption: { color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: 3 },
  pledgeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
    paddingVertical: 12,
  },
  profileHero: { alignItems: "center", gap: 8, paddingVertical: 10 },
  avatarLarge: {
    alignItems: "center",
    backgroundColor: `${colors.orangeDeep}12`,
    borderColor: `${colors.orangeDeep}28`,
    borderRadius: 34,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  avatarTextLarge: { color: colors.orangeDeep, fontSize: 22, fontWeight: "900" },
  profileName: { color: colors.text, fontSize: 22, fontWeight: "900", letterSpacing: -0.5, marginTop: 4 },
  profileEmail: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 6 },
  roofBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  profileActionStack: { gap: 10, marginTop: 8 },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: `${colors.orangeDeep}08`,
    borderColor: `${colors.orangeDeep}24`,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryActionTitle: { color: colors.text, fontSize: typography.small, fontWeight: "800" },
  secondaryActionNote: { color: colors.muted, fontSize: 12, fontWeight: "600", lineHeight: 17, marginTop: 3 },
  photoSection: { marginTop: 16 },
  photoSectionTitle: { color: colors.text, fontSize: 13, fontWeight: "800", letterSpacing: 0.2, marginBottom: 10 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoTile: {
    backgroundColor: `${colors.orangeDeep}06`,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    padding: 12,
    width: "47%",
  },
  photoThumb: {
    alignItems: "center",
    backgroundColor: `${colors.orangeDeep}12`,
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  photoLabel: { color: colors.text, fontSize: 12, fontWeight: "800" },
  photoDetail: { color: colors.muted, fontSize: 11, fontWeight: "600", lineHeight: 15 },
  cardTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: typography.title + 6,
    marginTop: 6,
  },
  bodyText: { color: colors.muted, fontSize: typography.small, lineHeight: 20, marginTop: 8, marginBottom: 12 },
  input: {
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  segmented: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(150, 90, 53, 0.14)",
    backgroundColor: colors.white,
    padding: 4,
  },
  segment: { flex: 1, alignItems: "center", borderRadius: 999, paddingVertical: 9 },
  segmentSelected: { backgroundColor: `${colors.orangeDeep}18` },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  segmentTextSelected: { color: colors.orangeDeep },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
    paddingVertical: 12,
  },
  rowLabel: { color: colors.text, fontSize: typography.small, fontWeight: "700" },
  rowNote: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  rowValue: { color: colors.text, flexShrink: 0, fontSize: typography.small, fontWeight: "800" },
  progressTrack: { height: 12, borderRadius: 999, backgroundColor: `${colors.orangeDeep}14`, marginVertical: 16, overflow: "hidden" },
  progressFill: { height: 12, borderRadius: 999, backgroundColor: colors.orangeDeep },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    alignItems: "center",
    backgroundColor: `${colors.orangeDeep}18`,
    borderRadius: 22,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  avatarText: { color: colors.orangeDeep, fontSize: 18, fontWeight: "800" },
  logoutButton: {
    alignItems: "center",
    borderColor: `${colors.red}55`,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
  },
  logoutText: { color: colors.red, fontWeight: "800" },
});
