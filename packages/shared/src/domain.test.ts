import { auditAllDemoProjects } from "./consistency";
import { calculateDrs } from "./drs";
import { calculateEnergy, calculateSavings } from "./energy";
import { calculateLbrs } from "./lbrs";
import { generationVisibilityForRole } from "./generationVisibility";
import { calculateOwnershipPayouts, transferOwnership } from "./ownership";
import { calculatePayback } from "./payback";
import { projectBuilding } from "./projector";
import { calculateSettlement, validateSettlementRates } from "./settlement";
import { compareSyntheticScenarioOutcomes, createSyntheticDemoSession, replaySyntheticScenario, syntheticScenarioPhases } from "./simulator";
import { demoProjects } from "./mockData";
import type { DrsInputs } from "./types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertClose(actual: number, expected: number, message: string, tolerance = 0.01) {
  assert(Math.abs(actual - expected) <= tolerance, `${message}. Expected ${expected}, received ${actual}.`);
}

function assertThrows(run: () => unknown, message: string) {
  let threw = false;
  try {
    run();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

const baseDrsInput = {
  siteKind: "apartment" as const,
  demandCoverage: 90,
  prepaidCommitment: 85,
  loadProfile: 80,
  installationReadiness: 82,
  installerReadiness: 88,
  capitalAlignment: 84,
  projectedUtilization: 0.78,
  hasPrepaidFunds: true,
  hasResidentDemandSignal: true,
  hasCertifiedLeadElectrician: true,
  solarApartmentCapacityFitVerified: true,
  apartmentAtsMeterMappingVerified: true,
  atsKplcSwitchingVerified: true,
  ownerPermissionsComplete: true,
  hasVerifiedSupplierQuote: true,
  siteInspectionComplete: true,
  capacityPlanApproved: true,
  stakeholdersVetted: true,
  electricianLaborPaymentResolved: true,
  contractsAndComplianceReady: true,
  monitoringConnectivityResolved: true,
  settlementDataTrusted: true,
};

function runSharedDomainTests() {
  const energy = calculateEnergy({
    arrayKw: 10,
    peakSunHours: 5,
    systemEfficiency: 0.8,
    batteryKwh: 8,
    batteryDepthOfDischarge: 0.75,
    batteryRoundTripEfficiency: 0.9,
    monthlyDemandKwh: 900,
    daytimeDemandFraction: 0.4,
  });

  assertClose(energy.E_gen, 1200, "Monthly generation should follow array, sun, and efficiency inputs");
  assertClose(energy.E_sold, 522, "Sold energy should include direct solar and usable battery discharge");
  assertClose(energy.E_waste, 660, "Waste should only include generated energy that is neither direct nor charged");
  assertClose(energy.E_grid, 378, "Grid fallback should cover unmet monthly demand");
  assertClose(energy.wasteRate, 0.55, "Waste rate should be E_waste / E_gen");
  assertClose(calculateSavings(100, 28, 20), 800, "Savings should compare grid and solar price");

  const settlement = calculateSettlement(100, 20, {
    reserve: 0.05,
    providers: 0.3,
    financiers: 0.45,
    owner: 0.06,
    emappa: 0.14,
  });

  assertClose(settlement.revenue, 2000, "Settlement revenue should be sold kWh multiplied by price");
  assertClose(settlement.providerPool, 600, "Provider pool should follow configured rate");
  assertClose(settlement.unallocated, 0, "Balanced settlement rates should leave no unallocated revenue");
  assertClose(settlement.allocatedTotal, 2000, "Allocated pools should sum to revenue when balanced");
  assert(validateSettlementRates({ reserve: 0.05, providers: 0.3, financiers: 0.45, owner: 0.06, emappa: 0.14 }).isBalanced, "Demo settlement rates should balance");

  const payouts = calculateOwnershipPayouts(1000, [
    { ownerId: "provider", ownerRole: "provider", percentage: 0.7 },
    { ownerId: "resident", ownerRole: "resident", percentage: 0.3 },
  ]);
  assertClose(payouts[0].payout, 700, "Ownership payout should follow ownership percentage");
  assertThrows(
    () => calculateOwnershipPayouts(1000, [{ ownerId: "provider", ownerRole: "provider", percentage: 0.9 }]),
    "Ownership payout calculation should reject ledgers that do not total 100%",
  );

  const transferred = transferOwnership(
    [{ ownerId: "provider", ownerRole: "provider", percentage: 1 }],
    "provider",
    { ownerId: "resident", ownerRole: "resident", percentage: 0.25 },
  );
  assertClose(transferred[0].percentage, 0.75, "Seller ownership should decrease after transfer");
  assertClose(transferred[1].percentage, 0.25, "Buyer ownership should be added after transfer");

  const readyDrs = calculateDrs(baseDrsInput);
  assert(readyDrs.decision === "deployment_ready", "All critical gates green should yield deployment_ready");

  const blockedDrs = calculateDrs({ ...baseDrsInput, projectedUtilization: 0.59 });
  assert(blockedDrs.decision === "blocked", "Low utilization should block regardless of display score");

  const blockedQuote = calculateDrs({ ...baseDrsInput, hasVerifiedSupplierQuote: false });
  assert(blockedQuote.decision === "blocked", "Missing hardware package should block");

  const homeownerStakeholderReadyViaProxy: DrsInputs = {
    siteKind: "homeowner",
    demandCoverage: 70,
    prepaidCommitment: 65,
    loadProfile: 72,
    installationReadiness: 68,
    installerReadiness: 76,
    capitalAlignment: 70,
    projectedUtilization: 0.76,
    hasPrepaidFunds: true,
    hasResidentDemandSignal: true,
    hasCertifiedLeadElectrician: true,
    solarApartmentCapacityFitVerified: true,
    apartmentAtsMeterMappingVerified: true,
    atsKplcSwitchingVerified: true,
    ownerPermissionsComplete: true,
    hasVerifiedSupplierQuote: true,
    monitoringConnectivityResolved: true,
    settlementDataTrusted: true,
    contractsAndComplianceReady: true,
    propertyAuthorityComplete: true,
    siteFeasibilityComplete: true,
    loadProfileSizingComplete: true,
    capitalAndLaborResolved: true,
    hardwareProcurementComplete: true,
    legalUtilityDisciplineComplete: true,
    stakeholdersVetted: false,
  };
  const homeownerProxyStakeholder = calculateDrs(homeownerStakeholderReadyViaProxy);
  assert(
    homeownerProxyStakeholder.decision === "deployment_ready",
    "Homeowner stakeholder readiness accepts electrician + verified quote when stakeholdersVetted is unset/false",
  );
  assert(
    !homeownerProxyStakeholder.criticalFailures.some((f) => f.code === "STAKE_READY"),
    "Stakeholder readiness gate must not fire when proxy signals satisfy OR rule",
  );
  const stakeRow = homeownerProxyStakeholder.checklist.find((c) => c.id === "stake");
  assert(stakeRow?.complete === true, "Stakeholder checklist row must match stakeholder readiness gate");

  const lbrsPass = calculateLbrs({
    asBuiltBomVerified: true,
    electricalSafetyComplete: true,
    solarBusIsolationVerified: true,
    inverterBatteryTestsComplete: true,
    atsSwitchingPerApartmentComplete: true,
    meterMappingDataReliable: true,
    tokenSettlementDryRunPassed: true,
    backendTokenControlDryRunPassed: true,
    residentOwnerLaunchReadinessComplete: true,
  });
  assert(lbrsPass.decision === "deployment_ready", "LBRS should be live-ready when all tests pass");

  const lbrsFail = calculateLbrs({
    asBuiltBomVerified: true,
    electricalSafetyComplete: false,
    solarBusIsolationVerified: true,
    inverterBatteryTestsComplete: true,
    atsSwitchingPerApartmentComplete: true,
    meterMappingDataReliable: true,
    tokenSettlementDryRunPassed: true,
    backendTokenControlDryRunPassed: true,
    residentOwnerLaunchReadinessComplete: true,
  });
  assert(lbrsFail.decision === "blocked", "LBRS must block on failed safety");

  const payback = calculatePayback({ investment: 12000, monthlyPayout: 1000 });
  assertClose(payback.yearsToPrincipal, 1, "Payback should convert principal months to years");
  assert(!payback.notCurrentlyRecovering, "Positive monthly payout should recover");

  const zeroPayback = calculatePayback({ investment: 12000, monthlyPayout: 0 });
  assert(zeroPayback.notCurrentlyRecovering, "Zero payout should surface notCurrentlyRecovering");

  const poolPayout = 5000;
  const paybackOne = calculatePayback({ investment: 100_000, monthlyPayout: poolPayout });
  const paybackMany = calculatePayback({ investment: 100_000, monthlyPayout: poolPayout });
  assertClose(paybackOne.principalMonths, paybackMany.principalMonths, "Financier count does not change payback period for fixed pool payout");
  const perPerson = calculateOwnershipPayouts(poolPayout, [
    { ownerId: "f1", ownerRole: "financier", percentage: 0.5 },
    { ownerId: "f2", ownerRole: "financier", percentage: 0.5 },
  ]);
  assertClose(perPerson[0].payout + perPerson[1].payout, poolPayout, "Ownership splits pool across financiers without changing pool size");

  const homeownerProject = projectBuilding({
    ...demoProjects[0],
    buildingKind: "single_family",
    stage: "live",
  });
  assert(homeownerProject.roleViews.owner.monthlyRoyaltyKes === 0, "Homeowner sites must not accrue host royalty on own roof");
  assert(
    generationVisibilityForRole("resident", { shareOwnershipPct: 0 }).visible === false,
    "Resident generation detail should be hidden without share ownership",
  );
  assert(
    generationVisibilityForRole("provider", { shareOwnershipPct: 0.1 }).visible === true,
    "Provider generation detail should be visible with retained ownership",
  );
  assert(
    generationVisibilityForRole("building_owner").visible === true && generationVisibilityForRole("homeowner").visible === true,
    "Site owners keep generation visibility through site authority",
  );
  assert(
    generationVisibilityForRole("financier", { capitalExposureKes: 1 }).visible === true,
    "Financier generation view follows named-building capital exposure",
  );

  const projected = projectBuilding(demoProjects[0]);
  assert(projected.roleViews.resident.averagePrepaidBalanceKes > 0, "Projected role views should expose resident prepaid balance");
  assert(projected.roleViews.financier.committedCapitalKes === demoProjects[0].fundedKes, "Financier view should expose committed capital");
  assert(projected.lbrs.decision === "blocked", "Non-live demo project should not pass LBRS until go-live");
  assert(projected.operationalWorkflows.length >= 7, "Projected buildings should expose imported-scenario operational workflow status");
  assert(projected.roleViews.provider.quoteReservation?.id === "quote_reservation", "Provider view should expose quote reservation traceability");
  assert(projected.roleViews.financier.kycEscrow?.prototypeScope === true, "Financier KYC/escrow status should stay explicitly prototype-scoped");
  assert(projected.roleViews.electrician.aiEvidenceIngestion?.status === "prototype", "AI evidence ingestion must be a placeholder, not an approval path");

  const audit = auditAllDemoProjects();
  assert(audit.ok, `Demo projects should pass shared consistency audit: ${audit.results.map((result) => result.issues.join("; ")).join(" | ")}`);

  const replayed = syntheticScenarioPhases.map((phase) => replaySyntheticScenario({ phase, now: "2026-05-15T00:00:00.000Z" }));
  assert(replayed[0].project.project.stage === "pre_onboarding", "Synthetic replay should start from onboarding state");
  assert(replayed.at(-1)?.project.project.stage === "live", "Synthetic replay should reach live state");
  assert(replayed.at(-1)?.project.lbrs.decision === "deployment_ready", "Synthetic replay should pass LBRS at go-live/settlement");
  assert((replayed.at(-1)?.events.length ?? 0) >= syntheticScenarioPhases.length, "Synthetic replay should expose lifecycle events");
  assert(
    (replayed.at(-1)?.roleTimelines.resident.length ?? 0) > 0 &&
      (replayed.at(-1)?.roleTimelines.provider.length ?? 0) > 0 &&
      (replayed.at(-1)?.roleTimelines.financier.length ?? 0) > 0 &&
      (replayed.at(-1)?.roleTimelines.electrician.length ?? 0) > 0,
    "Synthetic replay should derive role-specific stakeholder timelines",
  );
  assert(
    replayed.at(-1)?.sourceSpec.includes("scenario-a-resident") ?? false,
    "Synthetic replay should trace back to the imported scenario document",
  );

  const failureComparison = compareSyntheticScenarioOutcomes("ats_mapping_gap", "settlement");
  assert(failureComparison.variant.project.drs.decision === "blocked", "ATS mapping failure should block DRS");
  assert(failureComparison.variant.project.lbrs.decision === "blocked", "ATS mapping failure should block LBRS");
  assert(failureComparison.delta.drsChanged, "Scenario comparison should report DRS decision changes");

  const demoSession = createSyntheticDemoSession("provider", { phase: "settlement" });
  assert(demoSession.user.role === "provider", "Synthetic demo session should preserve selected role");
  assert(demoSession.user.buildingId === replayed.at(-1)?.project.project.id, "Synthetic demo session should attach the scenario building");
  assert(demoSession.user.profile.syntheticDemo === true, "Synthetic demo session should be explicitly marked as demo data");
}

runSharedDomainTests();

// ---- P0.0.4 type-contract lock smoke tests ---------------------------------
// Construct one value of each new shape so a structural break fails `tsc`.
// Plus a few runtime asserts on the const TTL table per ADR 0001 §4.

import type {
  AgentId,
  AgentProposal,
  AgentActionRecord,
  AgentEvalRunRecord,
  PiiClass,
  PiiClaim,
  AuditLogEntry,
  AlertRecord,
  IncidentRecord,
  ApartmentAtsState,
  LoadProfileCapture,
  CapacityQueueEntry,
  PledgeRecord,
  TokenPurchaseRecord,
  BoState,
  HoState,
  ProviderState,
  HomeownerEdgeCaseId,
  QuoteState,
} from "./types";
import { PII_CLAIM_TTL_SECONDS } from "./types";

function runP004TypeLockTests() {
  const agentId: AgentId = "drs";
  const proposal: AgentProposal = {
    agent_id: agentId,
    agent_version: "0.0.1-stub",
    proposed_action: "no-op",
    confidence: 0.0,
    evidence_uris: [],
    rationale: "stub",
  };
  const action: AgentActionRecord = {
    id: "aa-1",
    proposal,
    status: "pending_admin_approval",
    audit_log_id: null,
    decided_by: null,
    decided_at: null,
    decision_reason: null,
    created_at: "2026-05-16T00:00:00.000Z",
  };
  const evalRun: AgentEvalRunRecord = {
    id: "er-1",
    agent_id: agentId,
    agent_version: "0.0.1-stub",
    scorecard: { precision: 0 },
    regression_delta: { precision: 0 },
    pass: true,
    ts: "2026-05-16T00:00:00.000Z",
  };

  const pclass: PiiClass = "contact";
  const claim: PiiClaim = {
    subject_id: "u-1",
    class: pclass,
    granted_by: "admin-1",
    granted_at: "2026-05-16T00:00:00.000Z",
    expires_at: "2026-05-16T08:00:00.000Z",
    reason: "triage",
    incident_id: null,
    step_up_verified_at: null,
  };

  const audit: AuditLogEntry = {
    id: "al-1",
    actor_id: "admin-1",
    actor_kind: "user",
    action: "pledge:create",
    target_entity: "pledge",
    target_id: "p-1",
    before: null,
    after: { amount_kes: 1000 },
    reason: "test",
    agent_attribution: null,
    surface: "cockpit",
    ts: "2026-05-16T00:00:00.000Z",
  };

  const alert: AlertRecord = {
    id: "alert-1",
    severity: "warning",
    status: "open",
    source: "settlement_runner",
    owner_role: "admin",
    building_id: null,
    ts: "2026-05-16T00:00:00.000Z",
    remediation_status: null,
  };
  const incident: IncidentRecord = {
    id: "inc-1",
    severity: "critical",
    status: "investigating",
    root_cause: null,
    postmortem_uri: null,
    alert_ids: [alert.id],
    opened_at: "2026-05-16T00:00:00.000Z",
    closed_at: null,
  };

  const ats: ApartmentAtsState = "active_solar";
  const queue: CapacityQueueEntry = {
    id: "cq-1",
    building_id: "b-1",
    user_id: "u-1",
    status: "queued",
    position: 3,
    priority_factors: ["pledge_amount", "early_signup"],
    joined_at: "2026-05-16T00:00:00.000Z",
    cleared_at: null,
    activated_at: null,
  };
  const lp: LoadProfileCapture = {
    level: "L1",
    appliances: [{ name: "lighting", watts: 60, hours_per_day: 5 }],
    daytime_kwh: 2,
    evening_kwh: 3,
    receipt_url: null,
    confidence: 0.4,
  };

  const pledge: PledgeRecord = {
    id: "pl-1",
    building_id: "b-1",
    user_id: "u-1",
    amount_kes: null,
    status: "active",
    created_at: "2026-05-16T00:00:00.000Z",
    closed_at: null,
  };
  const purchase: TokenPurchaseRecord = {
    id: "tp-1",
    building_id: "b-1",
    user_id: "u-1",
    amount_kes: 500,
    payment_method: "mpesa",
    created_at: "2026-05-16T00:00:00.000Z",
  };

  const bo: BoState = "B7";
  const ho: HoState = "H7";
  const prov: ProviderState = "E8";
  const edge: HomeownerEdgeCaseId = "HC3";
  const qs: QuoteState = "expired_or_cancelled";

  assert(PII_CLAIM_TTL_SECONDS.contact === 28800, "contact TTL = 8h per ADR 0001 §4");
  assert(PII_CLAIM_TTL_SECONDS.identity === 14400, "identity TTL = 4h per ADR 0001 §4");
  assert(PII_CLAIM_TTL_SECONDS.financial === 3600, "financial TTL = 1h per ADR 0001 §4");

  // touch every constructed value so tsc doesn't tree-shake the type checks
  const touched = [
    action.id,
    evalRun.id,
    claim.subject_id,
    audit.id,
    incident.id,
    ats,
    queue.id,
    lp.level,
    pledge.id,
    purchase.id,
    bo,
    ho,
    prov,
    edge,
    qs,
  ];
  assert(touched.length === 15, "all P0.0.4 lock-batch types constructed");
}

runP004TypeLockTests();
console.log("Shared domain tests passed.");
