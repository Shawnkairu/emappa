// Per docs/SPRINT_CONTRACT.md §4 and docs/IA_SPEC.md §1
// - 'supplier' merged into 'provider' (with BusinessType for differentiation)
// - 'installer' renamed to 'electrician'
// - 'owner' renamed to 'building_owner'
// - 'homeowner' added: single-family-home owner who is also the sole resident
//   of their own building. Combines building_owner project lifecycle with
//   resident token/consumption flow. Backed by buildings.kind='single_family'.
// Admin is intentionally last; role-select UI must filter to PublicRole only.
export type Role =
  | "resident"
  | "homeowner"
  | "building_owner"
  | "provider"
  | "financier"
  | "electrician"
  | "admin";

export type PublicRole = Exclude<Role, "admin">;

export type BusinessType = "panels" | "infrastructure" | "both";

export type BuildingKind = "apartment" | "single_family" | "small_compound";

// Back-compat alias. New code should prefer Role.
export type StakeholderRole = Role;

/** Canonical DRS outcome — never infer deployment from display % alone (see docs/imported-specs). */
export type DeploymentDecision = "deployment_ready" | "review" | "blocked";

/** @deprecated Use `deployment_ready` — kept for archived JSON/migrations only */
export type LegacyDeploymentDecision = "approve" | "review" | "block";

export type DrsSiteKind = "apartment" | "homeowner";

export type DataQualityStatus = "verified" | "estimated" | "missing" | "delayed" | "disputed" | "conservative";

export type ExternalMonetization = "none" | "net_metering" | "export_credit" | "energy_trading" | "wheeling";

export type SettlementPhase = "recovery" | "royalty";

export type OperationalWorkflowId =
  | "ats_activation"
  | "verification_documents"
  | "quote_reservation"
  | "delivery_evidence"
  | "go_live_signoff"
  | "kyc_escrow"
  | "ai_evidence_ingestion";

export type OperationalWorkflowStatus = "pending" | "in_review" | "ready" | "blocked" | "prototype";

export interface OperationalWorkflowSnapshot {
  id: OperationalWorkflowId;
  label: string;
  status: OperationalWorkflowStatus;
  ownerRole: PublicRole | "admin";
  detail: string;
  evidenceLabel: string;
  /** Truthful pilot/prototype boundary; use when no production integration exists yet. */
  prototypeScope: boolean;
}

export interface DrsGateFailure {
  code: string;
  message: string;
  /** Who must act next; optional when internal/ops */
  responsibleRole?: PublicRole | "admin";
}

export interface DrsChecklistItem {
  id: string;
  category: string;
  displayWeight: number;
  critical: boolean;
  complete: boolean;
  label: string;
}

export interface LbrsChecklistItem {
  id: string;
  testName: string;
  displayWeight: number;
  critical: boolean;
  complete: boolean;
  label: string;
}

export type CapacityQueueStatus =
  | "interested"
  | "pledged"
  | "capacity_review"
  | "capacity_cleared"
  | "queued"
  | "waitlisted"
  | "activated";

// 9 states per IA_SPEC Reference Appendix A.9 (Scenario E §7.1).
// `expired` and `cancelled` are a single terminal state in the spec.
export type QuoteState =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "reserved"
  | "committed"
  | "delivered"
  | "installed_activated"
  | "expired_or_cancelled";

export type ElectricianCertificationTier =
  | "helper"
  | "verified_electrician"
  | "lead_electrician"
  | "senior_inspector"
  | "restricted_probation";

export type FinancierEligibilityTier =
  | "watch_only"
  | "retail_limited"
  | "sophisticated"
  | "entity"
  | "institutional"
  | "restricted_jurisdiction";
export type ProjectStage =
  | "lead"
  | "inspection"
  | "pre_onboarding"
  | "review"
  | "funding"
  | "supplier"
  | "install"
  | "verification"
  | "live"
  | "blocked";

export interface EnergyInputs {
  arrayKw: number;
  peakSunHours: number;
  systemEfficiency: number;
  batteryKwh: number;
  batteryDepthOfDischarge: number;
  batteryRoundTripEfficiency: number;
  monthlyDemandKwh: number;
  daytimeDemandFraction: number;
}

export interface EnergyOutputs {
  E_gen: number;
  E_direct: number;
  E_charge: number;
  E_battery_used: number;
  E_sold: number;
  E_waste: number;
  E_grid: number;
  utilization: number;
  /** E_waste / E_gen (0 when E_gen is 0) */
  wasteRate: number;
  coverage: number;
}

export interface SettlementRates {
  reserve: number;
  providers: number;
  financiers: number;
  owner: number;
  emappa: number;
}

export interface SettlementOutputs {
  revenue: number;
  reserve: number;
  providerPool: number;
  financierPool: number;
  ownerRoyalty: number;
  emappaFee: number;
  unallocated: number;
  /** Sum of pool payouts — equals revenue when rates balanced and no shortfall */
  allocatedTotal: number;
  /** revenue - allocatedTotal when rates exceed 100% or forced cap */
  shortfallKes: number;
  phase: SettlementPhase;
}

export interface OwnershipPosition {
  ownerId: string;
  ownerRole: StakeholderRole;
  percentage: number;
}

export interface OwnershipPayout {
  ownerId: string;
  ownerRole: StakeholderRole;
  percentage: number;
  payout: number;
}

/**
 * DRS inputs — canonical gate model in docs/imported-specs/installation-process-drs-lbrs-go-live.md.
 * Display components are advisory weights; `decision` is derived only from critical gates + warnings.
 */
export interface DrsInputs {
  /** Apartment vs homeowner path — selects which critical gate set applies */
  siteKind?: DrsSiteKind;
  /** Demand / load confidence (0–100) — display weight only unless paired with utilization kill */
  demandCoverage: number;
  prepaidCommitment: number;
  loadProfile: number;
  installationReadiness: number;
  /** @deprecated Prefer `electricianReadiness`; retained for demo JSON */
  installerReadiness: number;
  /** Electrician crew readiness score (0–100), display weight */
  electricianReadiness?: number;
  capitalAlignment: number;
  projectedUtilization: number;
  /**
   * Resident prepaid cash on books (when applicable).
   * Pilot pledges are non-purchases; use `hasResidentDemandSignal` for demand proof.
   */
  hasPrepaidFunds: boolean;
  /** Non-binding pledges + load artifacts sufficient to treat demand as evidenced */
  hasResidentDemandSignal?: boolean;
  hasCertifiedLeadElectrician: boolean;
  /** Solar/battery capacity verified against participating apartments (dedicated solar path, not common-bus). */
  solarApartmentCapacityFitVerified: boolean;
  /** Design-stage: apartment ATS + PAYG meter mapping plan complete */
  apartmentAtsMeterMappingVerified: boolean;
  /** Design-stage: ATS / KPLC failover architecture validated */
  atsKplcSwitchingVerified: boolean;
  ownerPermissionsComplete: boolean;
  /** Hardware package / verified BOM or quote for procurement */
  hasVerifiedSupplierQuote: boolean;
  /** Site inspection evidence complete (roof, meter bank, cable routes) */
  siteInspectionComplete?: boolean;
  /** Capacity plan (phases, max apartments, reserve margin) approved */
  capacityPlanApproved?: boolean;
  /** Vetted stakeholders committed (electrician, provider, financier as required) */
  stakeholdersVetted?: boolean;
  /** Electrician labor funded upfront or signed labor-as-capital terms */
  electricianLaborPaymentResolved?: boolean;
  /** Contracts, waterfall, compliance review signed off */
  contractsAndComplianceReady?: boolean;
  /** Homeowner-only: title/site authority verified */
  propertyAuthorityComplete?: boolean;
  /** Homeowner-only: roof/DB/meter feasibility */
  siteFeasibilityComplete?: boolean;
  /** Homeowner-only: load vs sizing discipline */
  loadProfileSizingComplete?: boolean;
  /** Homeowner-only: capital stack + labor payment */
  capitalAndLaborResolved?: boolean;
  /** Homeowner-only: procurement BOM path */
  hardwareProcurementComplete?: boolean;
  /** Homeowner-only: export / anti-islanding / permits */
  legalUtilityDisciplineComplete?: boolean;
  monitoringConnectivityResolved: boolean;
  settlementDataTrusted: boolean;
}

export interface DrsResult {
  /** Weighted display score (0–100); does not authorize installation without critical gates */
  score: number;
  decision: DeploymentDecision;
  /** Human-readable reasons (blockers + warnings) */
  reasons: string[];
  criticalFailures: DrsGateFailure[];
  warnings: string[];
  checklist: DrsChecklistItem[];
  components: {
    demandCoverage: number;
    prepaidCommitment: number;
    loadProfile: number;
    installationReadiness: number;
    electricianReadiness: number;
    /** @deprecated Use `electricianReadiness` */
    installerReadiness: number;
    capitalAlignment: number;
  };
}

export interface LbrsInputs {
  siteKind?: DrsSiteKind;
  asBuiltBomVerified: boolean;
  electricalSafetyComplete: boolean;
  solarBusIsolationVerified: boolean;
  inverterBatteryTestsComplete: boolean;
  atsSwitchingPerApartmentComplete?: boolean;
  /** Home path: changeover/ATS tests */
  homeSwitchingFallbackComplete?: boolean;
  meterMappingDataReliable: boolean;
  tokenSettlementDryRunPassed: boolean;
  backendTokenControlDryRunPassed: boolean;
  residentOwnerLaunchReadinessComplete: boolean;
}

export interface LbrsResult {
  score: number;
  decision: DeploymentDecision;
  reasons: string[];
  criticalFailures: DrsGateFailure[];
  warnings: string[];
  checklist: LbrsChecklistItem[];
}

export interface PaybackInputs {
  investment: number;
  monthlyPayout: number;
  targetMultiple?: number;
}

export interface PaybackResult {
  principalMonths: number;
  targetMonths: number;
  yearsToPrincipal: number;
  yearsToTarget: number;
  /** True when monthly monetized payout is zero or negative — do not show a fake payback date */
  notCurrentlyRecovering: boolean;
}

export interface BuildingProject {
  id: string;
  name: string;
  locationBand: string;
  units: number;
  stage: ProjectStage;
  /** Defaults to apartment economics when omitted */
  buildingKind?: BuildingKind;
  energy: EnergyInputs;
  solarPriceKes: number;
  gridPriceKes: number;
  settlementRates: SettlementRates;
  settlementPhase?: SettlementPhase;
  /** When omitted, derived from `stage` in projector (non-live = blocked LBRS). */
  lbrs?: LbrsInputs;
  drs: DrsInputs;
  providerOwnership: OwnershipPosition[];
  financierOwnership: OwnershipPosition[];
  capitalRequiredKes: number;
  fundedKes: number;
  prepaidCommittedKes: number;
  operationalWorkflows?: OperationalWorkflowSnapshot[];
}

// =============================================================================
// SPRINT_CONTRACT additions — per docs/SPRINT_CONTRACT.md §4
// These are the locked types all three sprint agents code against.
// =============================================================================

export interface User {
  id: string;
  email: string;
  phone: string | null;
  role: Role;
  businessType: BusinessType | null;   // only meaningful when role === 'provider'
  buildingId: string | null;
  onboardingComplete: boolean;
  displayName: string | null;
  profile: Record<string, unknown>;     // role-specific onboarding bag; see SPRINT_CONTRACT §4
  createdAt: string;
  lastSeenAt: string | null;
}

export interface ElectricianProfile {
  region?: string;
  scope?: Array<"install" | "inspection" | "maintenance">;
}

export interface FinancierProfile {
  investor_kind?: "individual" | "institution";
  target_deal_size_kes?: number;
  target_return_pct?: number;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  formattedAddress: string;
}

export interface PrepaidCommitment {
  id: string;
  buildingId: string;
  userId: string;
  amountKes: number;
  paymentMethod: "pledge" | "mpesa";
  status: "pending" | "confirmed" | "failed";
  createdAt: string;
  confirmedAt: string | null;
}

export interface EnergyReading {
  buildingId: string;
  timestamp: string;
  kind: "generation" | "load" | "irradiance";
  value: number;
  unit: string;
  source: "synthetic" | "measured";
  provenance: string;
  dataQuality?: DataQualityStatus;
}

// Geo polygon. Loosely typed as GeoJSON-like; full GeoJSON typing not pulled in to avoid a dep.
export interface PolygonCoord {
  lat: number;
  lon: number;
}

export interface RoofPolygon {
  geojson: { type: "Polygon"; coordinates: number[][][] };
  areaM2: number;
  source: "microsoft_footprints" | "owner_traced" | "owner_typed";
  confidence: number;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface ProjectCard {
  buildingId: string;
  name: string;
  address: string;
  photoUrl: string | null;
  drsScore: number;
  drsDecision: DeploymentDecision;
  stage: "listed" | "qualifying" | "funding" | "installing" | "live" | "retired";
  gapSummary: string;
  capitalAskKes?: number;
  equipmentAsk?: { panels?: number; infrastructure?: string[] };
  electricianAsk?: { scope: "install" | "inspection" | "maintenance"; payEstimateKes: number };
}

export interface InventoryItem {
  id: string;
  providerUserId: string;
  sku: string;
  kind: "panel" | "infra";
  stock: number;
  unitPriceKes: number;
  reliabilityScore: number;
}

export interface Certification {
  id: string;
  electricianUserId: string;
  name: string;
  issuer: string;
  docUrl: string;
  issuedAt: string;
  expiresAt: string;
  status: "valid" | "expiring" | "expired";
}

export interface JobChecklistItem {
  id: string;
  label: string;
  status: "pending" | "done" | "failed";
  photoUrl?: string;
  reading?: string;
}

export interface Job {
  id: string;
  electricianUserId: string;
  buildingId: string;
  scope: "install" | "inspection" | "maintenance";
  status: "active" | "completed";
  checklist: JobChecklistItem[];
  payEstimateKes: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface FinancierPosition {
  buildingId: string;
  committedKes: number;
  deployedKes: number;
  returnsToDateKes: number;
  irrPct: number;
  milestonesHit: string[];
}

export interface WalletTransaction {
  id: string;
  userId: string;
  at: string;
  kind: "pledge" | "royalty" | "equipment_sale" | "job_payment" | "capital_deploy" | "capital_return";
  amountKes: number;       // signed: negative = out, positive = in
  reference: string;
}

// Persisted settlement record (distinct from SettlementOutputs which is computed/projected).
export interface SettlementPeriod {
  id: string;
  buildingId: string;
  periodStart: string;
  periodEnd: string;
  eGen: number;
  eSold: number;
  eWaste: number;
  revenueKes: number;
  payouts: {
    provider: number;
    financier: number;
    owner: number;
    emappa: number;
    reserve: number;
  };
  simulation: boolean;        // true for simulated/demo, false for measured
  dataSource: "synthetic" | "measured" | "mixed";
  createdAt: string;
}

// =============================================================================
// P0.0.4 type-contract lock batch (2026-05-16)
// Adds types required by P0.0.3 + P0.3.* + P1.* tasks. Per-phase additions for
// later phases (homeowner authority, host-royalty payout, provider verification,
// escrow, etc.) land at phase entry with coordinator approval.
// =============================================================================

// ---- AI-native agent contract (DONE_DEFINITION §AI agent backend skeleton A2)

export type AgentId =
  | "drs"
  | "lbrs"
  | "settlement"
  | "alert_triage"
  | "eligibility";

export interface AgentProposal {
  agent_id: AgentId;
  agent_version: string;
  proposed_action: string;
  /** 0.0–1.0 */
  confidence: number;
  evidence_uris: string[];
  rationale: string;
}

export type AgentActionStatus =
  | "pending_admin_approval"
  | "accepted"
  | "rejected";

export interface AgentActionRecord {
  id: string;
  proposal: AgentProposal;
  status: AgentActionStatus;
  audit_log_id: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  created_at: string;
}

export interface AgentEvalRunRecord {
  id: string;
  agent_id: AgentId;
  agent_version: string;
  scorecard: Record<string, number>;
  /** Δ vs previous run, per metric */
  regression_delta: Record<string, number>;
  pass: boolean;
  ts: string;
}

// ---- PII view-claim contract (ADR 0001 stricter variant)

export type PiiClass = "contact" | "identity" | "financial";

/** TTL in seconds per ADR 0001 §4: contact 8h, identity 4h, financial 1h. */
export const PII_CLAIM_TTL_SECONDS: Record<PiiClass, number> = {
  contact: 28800,
  identity: 14400,
  financial: 3600,
};

export interface PiiClaim {
  subject_id: string;
  class: PiiClass;
  granted_by: string;
  granted_at: string;
  expires_at: string;
  reason: string;
  /** Required for `identity` + `financial` per ADR 0001 §4 */
  incident_id: string | null;
  /** Required for `financial` per ADR 0001 §5 — 5-min fresh window */
  step_up_verified_at: string | null;
}

// ---- Audit log (CR-2, P0.3.1)

export type AuditActorKind = "user" | "agent" | "system";

/** Free-form for now; documented namespace pattern: <resource>:<verb> */
export type AuditAction = string;

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_kind: AuditActorKind;
  action: AuditAction;
  target_entity: string;
  target_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string;
  /** Set when actor_kind === 'agent' */
  agent_attribution: AgentId | null;
  surface: string;
  ts: string;
}

// ---- Alerts / incidents (AI-native §6, P0.3.8 / P0.3.9)

export type AlertSeverity = "info" | "warning" | "critical" | "page";

export type AlertStatus = "open" | "acknowledged" | "remediating" | "resolved";

export interface AlertRecord {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  owner_role: PublicRole | "admin";
  building_id: string | null;
  ts: string;
  remediation_status: string | null;
}

export type IncidentStatus = "open" | "investigating" | "remediating" | "resolved" | "postmortem";

export interface IncidentRecord {
  id: string;
  severity: AlertSeverity;
  status: IncidentStatus;
  root_cause: string | null;
  postmortem_uri: string | null;
  alert_ids: string[];
  opened_at: string;
  closed_at: string | null;
}

// ---- Scenario A — apartment ATS state machine (§2.1) + load profile (§7)

/**
 * 8-state per-apartment ATS machine, Scenario A §2.1.
 * `active_solar` and `active_kplc` are the two normal supply modes;
 * `throttled` enforces prepaid-balance limits without isolation.
 */
export type ApartmentAtsState =
  | "pre_install"
  | "installed_not_activated"
  | "active_solar"
  | "active_kplc"
  | "throttled"
  | "isolated"
  | "fault"
  | "suspended";

export type LoadProfileLevel = "L1" | "L2" | "L3";

export interface LoadProfileAppliance {
  name: string;
  watts: number;
  hours_per_day: number;
}

export interface LoadProfileCapture {
  level: LoadProfileLevel;
  appliances: LoadProfileAppliance[];
  daytime_kwh: number;
  evening_kwh: number;
  receipt_url: string | null;
  confidence: number;
}

// ---- Scenario A — capacity queue priority factors (§6.3)

/** Spec §6.3 priority factors that influence capacity_queue ordering. */
export type CapacityQueuePriorityFactor =
  | "pledge_amount"
  | "load_profile_fit"
  | "early_signup"
  | "geographic_cluster";

export interface CapacityQueueEntry {
  id: string;
  building_id: string;
  user_id: string;
  status: CapacityQueueStatus;
  position: number;
  priority_factors: CapacityQueuePriorityFactor[];
  joined_at: string;
  cleared_at: string | null;
  activated_at: string | null;
}

// ---- Pledge vs token split (ADR 0002, P0.3.15)

export type PledgeStatus = "active" | "cancelled" | "converted";

export interface PledgeRecord {
  id: string;
  building_id: string;
  user_id: string;
  /** Nullable: residents may pledge intent before specifying amount */
  amount_kes: number | null;
  status: PledgeStatus;
  created_at: string;
  /** Set when status transitions to 'cancelled' or 'converted' */
  closed_at: string | null;
}

export interface TokenPurchaseRecord {
  id: string;
  building_id: string;
  user_id: string;
  /** NOT NULL — real money */
  amount_kes: number;
  payment_method: "mpesa" | "card" | "bank";
  /** Immutable; no closed/cancelled — refunds are separate ledger entries */
  created_at: string;
}

// ---- State machine ids (Reference Appendix A.1–A.3, A.7)

/** Scenario B §4 / Reference Appendix A.1 */
export type BoState = "B0" | "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7" | "B8" | "B9";

/** Scenario C §5 / Reference Appendix A.2 */
export type HoState = "H0" | "H1" | "H2" | "H3" | "H4" | "H5" | "H6" | "H7" | "H8";

/** Scenario E §13 / Reference Appendix A.3 */
export type ProviderState =
  | "E0" | "E1" | "E2" | "E3" | "E4" | "E5" | "E6" | "E7" | "E8" | "E9" | "E10";

/** Scenario C §15 / Reference Appendix A.7 — 8 edge cases */
export type HomeownerEdgeCaseId =
  | "HC1" | "HC2" | "HC3" | "HC4" | "HC5" | "HC6" | "HC7" | "HC8";

// ---- RBAC scope (P0.3.3, P0.3.6, CR-7)

/**
 * Free-form string with the documented namespace pattern:
 *   pii:view:<contact|identity|financial>
 *   queue:<drs|lbrs|provider|electrician|financier|doc|counterparties>
 *   settlement:<run|hold|approve>
 *   admin:<grant_pii|approve_pii:financial|...>
 *
 * Per ADR 0001 §6, agent JWTs hold zero `pii:view:*` scopes.
 */
export type RbacScope = string;

// =============================================================================
// END P0.0.4 lock batch
// =============================================================================

// Building extension fields per IA + roof capture flow.
// Existing BuildingProject is the projector domain object; this is the persisted-record shape
// used by /buildings endpoints.
export interface BuildingRecord {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  unitCount: number;
  occupancy: number | null;
  kind: BuildingKind;     // 'single_family' is required when owner role is 'homeowner'
  stage: "listed" | "qualifying" | "funding" | "installing" | "live" | "retired";
  roofAreaM2?: number;
  roofPolygonGeojson?: { type: "Polygon"; coordinates: number[][][] };
  roofSource?: "microsoft_footprints" | "owner_traced" | "owner_typed";
  roofConfidence?: number;
  dataSource: "synthetic" | "measured" | "mixed";
  inviteCode?: string | null;          // shown to building owners; consumed by residents via /me/join-building
  createdAt: string;
  updatedAt: string;
}
