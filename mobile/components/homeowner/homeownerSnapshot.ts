import { useCallback, useRef } from "react";
import type { DrsResult, PrepaidCommitment, User, WalletTransaction } from "@emappa/shared";
import type { DeploymentPhase } from "../shared";
import { useApi } from "../../lib/api";
import { useApiData } from "../../lib/useApiData";

export type ApiStage = "listed" | "qualifying" | "funding" | "installing" | "live" | "retired";

export interface ApiBuilding {
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

export interface SettlementPeriod {
  id: string;
  eGen: number;
  eSold: number;
  eWaste: number;
  revenueKes: number;
  payouts: Record<string, number>;
  dataSource: "synthetic" | "measured" | "mixed";
}

export interface OwnershipPosition {
  percentage?: number;
  shareFraction?: number;
  ownerRole?: string;
  ownerId?: string;
}

export interface HomeownerSnapshot {
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

export async function loadHomeownerSnapshot(api: ReturnType<typeof useApi>): Promise<HomeownerSnapshot> {
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

export function useHomeownerSnapshot() {
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;
  const load = useCallback(() => loadHomeownerSnapshot(apiRef.current), []);
  return useApiData(load, []);
}

export function sumEnergy(values: number[] | null | undefined) {
  return values?.reduce((total, value) => total + value, 0) ?? 0;
}

export function formatKes(value: number) {
  return `KSh ${Math.round(value).toLocaleString()}`;
}

export function formatKwh(value: number) {
  return `${Number(value.toFixed(1)).toLocaleString()} kWh`;
}

export function formatPercent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function formatArea(value?: number | null) {
  return value ? `${Math.round(value).toLocaleString()} m²` : "Not captured";
}

export function formatStage(stage: string) {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function readinessLabel(drs: DrsResult | null) {
  if (!drs) {
    return "DRS unavailable";
  }
  return `${drs.decision} · ${drsScore(drs)}/100`;
}

export function drsScore(drs: DrsResult | null) {
  if (!drs) {
    return 0;
  }
  return drs.score <= 1 ? Math.round(drs.score * 100) : Math.round(drs.score);
}

export function deploymentProgress(stage: ApiStage) {
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
  return { percent, phases, stages, current };
}
