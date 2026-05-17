import type {
  AuthSession,
  BuildingRecord,
  DrsResult,
  EnergyReading,
  PrepaidCommitment,
  ProjectedBuilding,
  SettlementPeriod,
  User,
} from "@emappa/shared";

export const COCKPIT_SESSION_KEY = "emappa_cockpit_session";
export const CONSERVATIVE_HEADER = "X-Emappa-Conservative";
export const CONSERVATIVE_HEADER_EVENT = "emappa:conservative-header";
export const CONSERVATIVE_HEADER_STATE_KEY = "emappa_conservative_header";

export type ConservativeHeaderState = {
  active: boolean;
  at: string;
  value: string;
};

export type EnergyToday = {
  generation_kwh: number[];
  load_kwh: number[];
  irradiance_w_m2: number[];
};

export type DrsSnapshot = {
  buildingId?: string;
  score: number;
  decision?: string;
  components?: DrsResult["components"];
  createdAt?: string;
  at?: string;
};

type RequestOptions = RequestInit & {
  token?: string | null;
};

const env = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env;
const API_BASE_URL = cleanBaseUrl(
  env?.VITE_API_BASE_URL ??
    (globalThis as { __EMAPPA_API_BASE_URL__?: string }).__EMAPPA_API_BASE_URL__ ??
    "http://localhost:8010",
);

export function loadSession(): AuthSession | null {
  try {
    const raw = globalThis.localStorage?.getItem(COCKPIT_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  globalThis.localStorage?.setItem(COCKPIT_SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  globalThis.localStorage?.removeItem(COCKPIT_SESSION_KEY);
}

export async function requestOtp(email: string) {
  return api<{ ok: boolean }>("/auth/request-otp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function verifyOtp(email: string, code: string): Promise<AuthSession> {
  return api<AuthSession>("/auth/verify-otp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
}

export async function getMe(token: string) {
  return api<User>("/auth/me", { token });
}

export async function getProjects(token: string) {
  return api<ProjectedBuilding[]>("/projects", { token });
}

export async function getProject(buildingId: string, token: string) {
  return api<ProjectedBuilding>(`/projects/${encodeURIComponent(buildingId)}`, { token });
}

export async function getEnergyToday(buildingId: string, token: string) {
  return api<EnergyToday>(`/energy/${encodeURIComponent(buildingId)}/today`, { token });
}

export async function getEnergySeries(buildingId: string, token: string, kind: EnergyReading["kind"], from: string, to: string) {
  const params = new URLSearchParams({ kind, from, to });
  return api<EnergyReading[]>(`/energy/${encodeURIComponent(buildingId)}/series?${params.toString()}`, { token });
}

export async function getPrepaidHistory(buildingId: string, token: string) {
  return api<PrepaidCommitment[]>(`/prepaid/${encodeURIComponent(buildingId)}/history`, { token });
}

export async function getDrs(buildingId: string, token: string) {
  return api<DrsResult>(`/drs/${encodeURIComponent(buildingId)}`, { token });
}

export async function getDrsHistory(buildingId: string, token: string) {
  return api<DrsSnapshot[]>(`/drs/${encodeURIComponent(buildingId)}/history`, { token });
}

export async function updateDrsGates(buildingId: string, gates: Record<string, boolean>, token: string) {
  return api<{ drs: DrsResult }>(`/drs/${encodeURIComponent(buildingId)}/update`, {
    method: "POST",
    token,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ gates }),
  });
}

export async function getLatestSettlement(buildingId: string, token: string) {
  return api<SettlementPeriod | null>(`/settlement/${encodeURIComponent(buildingId)}/latest`, { token });
}

export async function getSettlementHistory(buildingId: string, token: string) {
  return api<SettlementPeriod[]>(`/settlement/${encodeURIComponent(buildingId)}/history`, { token });
}

export async function runSettlement(buildingId: string, token: string) {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodEnd.getDate() - 30);
  return api<{ period: SettlementPeriod }>("/settlement/run", {
    method: "POST",
    token,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      building_id: buildingId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    }),
  });
}

export function extractBuildingRecord(project: ProjectedBuilding): Partial<BuildingRecord> {
  const remote = project as unknown as { building?: Partial<BuildingRecord>; project?: Record<string, unknown> };
  const legacyProject = remote.project ?? {};
  return {
    ...(remote.building ?? {}),
    id: (remote.building?.id ?? legacyProject.id ?? project.project.id) as string,
    name: (remote.building?.name ?? legacyProject.name ?? project.project.name) as string,
    address: (remote.building?.address ?? legacyProject.address ?? project.project.locationBand) as string,
    stage: (remote.building?.stage ?? legacyProject.stage ?? project.project.stage) as BuildingRecord["stage"],
    unitCount: (remote.building?.unitCount ?? legacyProject.unitCount ?? legacyProject.units ?? project.project.units) as number,
    roofAreaM2: (remote.building?.roofAreaM2 ?? legacyProject.roofAreaM2 ?? legacyProject.roof_area_m2) as number | undefined,
    roofPolygonGeojson: (remote.building?.roofPolygonGeojson ??
      legacyProject.roofPolygonGeojson ??
      legacyProject.roof_polygon_geojson) as BuildingRecord["roofPolygonGeojson"] | undefined,
    roofSource: (remote.building?.roofSource ?? legacyProject.roofSource ?? legacyProject.roof_source) as BuildingRecord["roofSource"],
    roofConfidence: (remote.building?.roofConfidence ?? legacyProject.roofConfidence ?? legacyProject.roof_confidence) as number | undefined,
    dataSource: (remote.building?.dataSource ?? legacyProject.dataSource ?? legacyProject.data_source ?? "synthetic") as BuildingRecord["dataSource"],
    lat: (remote.building?.lat ?? legacyProject.lat) as number | undefined,
    lon: (remote.building?.lon ?? legacyProject.lon) as number | undefined,
  };
}

async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...init } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(headers ?? {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`API ${path} failed with ${response.status}${body ? `: ${body}` : ""}`);
  }

  publishConservativeHeader(response.headers.get(CONSERVATIVE_HEADER));

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function publishConservativeHeader(value: string | null) {
  if (value === null) return;

  const normalized = value.trim().toLowerCase();
  const state: ConservativeHeaderState = {
    active: ["1", "true", "yes", "conservative"].includes(normalized),
    at: new Date().toISOString(),
    value,
  };

  try {
    globalThis.sessionStorage?.setItem(CONSERVATIVE_HEADER_STATE_KEY, JSON.stringify(state));
  } catch {
    // The banner can still update from the in-memory event.
  }

  globalThis.dispatchEvent?.(new CustomEvent<ConservativeHeaderState>(CONSERVATIVE_HEADER_EVENT, { detail: state }));
}

function cleanBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}
