import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  compareSyntheticScenarioOutcomes,
  replaySyntheticScenario,
  syntheticFailureModes,
  syntheticScenarioPhases,
  type ProjectedBuilding,
  type SettlementPeriod,
  type SyntheticFailureMode,
  type SyntheticScenarioPhase,
} from "@emappa/shared";
import {
  clearSession,
  getLatestSettlement,
  getMe,
  getProjects,
  loadSession,
  requestOtp,
  saveSession,
  verifyOtp,
} from "./api";
import { PilotBanner } from "./components/PilotBanner";
import type { SyntheticMode } from "./components/SyntheticBadge";
import { BuildingDetail } from "./pages/BuildingDetail";

const StressTest = lazy(() => import("./stress-test/StressTest.jsx"));

type View = "command" | "stress";
type StageFilter = "all" | ProjectedBuilding["project"]["stage"];
type DecisionFilter = "all" | ProjectedBuilding["drs"]["decision"];
type Session = ReturnType<typeof loadSession>;

const navItems: Array<{ id: View; label: string }> = [
  { id: "command", label: "Command" },
  { id: "stress", label: "Stress Test" },
];

export function App() {
  const [session, setSession] = useState<Session>(() => loadSession());
  const [checkingSession, setCheckingSession] = useState(Boolean(session));
  const [view, setView] = useState<View>("command");
  const [projects, setProjects] = useState<ProjectedBuilding[]>([]);
  const [settlementDates, setSettlementDates] = useState<Record<string, SettlementPeriod | null>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [scenarioPhase, setScenarioPhase] = useState<SyntheticScenarioPhase>("settlement");
  const [scenarioFailureMode, setScenarioFailureMode] = useState<SyntheticFailureMode>("none");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [syntheticMode, setSyntheticMode] = useState<SyntheticMode>("mixed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setCheckingSession(false);
      return;
    }

    getMe(session.token)
      .then((user) => {
        const fresh = { ...session, user };
        if (fresh.user.role !== "admin") {
          rejectSession();
          return;
        }
        saveSession(fresh);
        setSession(fresh);
      })
      .catch(() => {
        rejectSession();
      })
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!checkingSession && session && session.user.role !== "admin") {
      rejectSession();
    }
  }, [checkingSession, session?.user.role]);

  useEffect(() => {
    if (!session || session.user.role !== "admin") return;
    setLoading(true);
    setError(null);
    getProjects(session.token)
      .then((items) => {
        // Backend /projects currently returns flat Building rows (see
        // backend/app/api/projects.py docstring — projector wiring is a TODO).
        // Until that lands, drop items that don't already have the projected
        // shape so the cockpit doesn't crash on `item.project.id`.
        const valid = items.filter(
          (item): item is typeof item & { project: { id: string } } =>
            Boolean((item as { project?: { id?: unknown } })?.project?.id),
        );
        setProjects(valid);
        setSelectedProjectId((current) => current ?? valid[0]?.project.id ?? null);
        return Promise.all(
          valid.map((item) =>
            getLatestSettlement(item.project.id, session.token)
              .then((settlement) => [item.project.id, settlement] as const)
              .catch(() => [item.project.id, null] as const),
          ),
        );
      })
      .then((dates) => {
        setSettlementDates(Object.fromEntries(dates));
      })
      .catch((loadError: Error) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [session?.token, session?.user.role]);

  const syntheticScenario = useMemo(
    () => replaySyntheticScenario({ phase: scenarioPhase, failureMode: scenarioFailureMode }),
    [scenarioFailureMode, scenarioPhase],
  );
  const cockpitProjects = [
    syntheticScenario.project,
    ...projects.filter((item) => item.project.id !== syntheticScenario.project.project.id),
  ];

  const filteredProjects = useMemo(() => {
    return cockpitProjects.filter((item) => {
      const settlement = settlementDates[item.project.id];
      const createdAt = settlement?.createdAt ? new Date(settlement.createdAt) : null;
      const afterFrom = fromDate && createdAt ? createdAt >= new Date(fromDate) : true;
      const beforeTo = toDate && createdAt ? createdAt <= new Date(`${toDate}T23:59:59`) : true;
      return (
        (stageFilter === "all" || item.project.stage === stageFilter) &&
        (decisionFilter === "all" || item.drs.decision === decisionFilter) &&
        afterFrom &&
        beforeTo
      );
    });
  }, [cockpitProjects, decisionFilter, fromDate, settlementDates, stageFilter, toDate]);

  const selectedProject = cockpitProjects.find((item) => item.project.id === selectedProjectId) ?? filteredProjects[0] ?? cockpitProjects[0];
  const totals = cockpitProjects.reduce(
    (acc, item) => ({
      revenue: acc.revenue + item.settlement.revenue,
      sold: acc.sold + item.energy.E_sold,
      alerts: acc.alerts + item.roleViews.admin.alertCount,
      pledged: acc.pledged + item.project.prepaidCommittedKes,
      capital: acc.capital + item.project.capitalRequiredKes,
      funded: acc.funded + item.project.fundedKes,
    }),
    { revenue: 0, sold: 0, alerts: 0, pledged: 0, capital: 0, funded: 0 },
  );
  const comparison =
    scenarioFailureMode === "none"
      ? null
      : compareSyntheticScenarioOutcomes(scenarioFailureMode, scenarioPhase);

  function logout() {
    rejectSession();
  }

  function rejectSession() {
    clearSession();
    setSession(null);
    setProjects([]);
    setSelectedProjectId(null);
  }

  function handleSession(nextSession: NonNullable<Session>) {
    if (nextSession.user.role !== "admin") {
      rejectSession();
      return;
    }

    saveSession(nextSession);
    setSession(nextSession);
  }

  function replaceProject(project: ProjectedBuilding) {
    setProjects((current) => current.map((item) => (item.project.id === project.project.id ? project : item)));
  }

  if (checkingSession) {
    return <main className="auth-shell">Checking cockpit session...</main>;
  }

  if (!session) {
    return <LoginScreen onSession={handleSession} />;
  }

  if (session.user.role !== "admin") {
    return <main className="auth-shell">Redirecting to logout...</main>;
  }

  return (
    <main className="ops-shell">
      <aside className="sidebar">
        <div className="logo">e</div>
        <strong>e.mappa cockpit</strong>
        <span className="session-meta">{session.user.email}</span>
        <nav>
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
              {item.label}
            </button>
          ))}
          <span>DRS Queue</span>
          <span>Settlement</span>
          <span>Counterparties</span>
          <span>Alerts</span>
        </nav>
        <button className="ghost-action" onClick={logout} type="button">
          Logout
        </button>
      </aside>

      <section className="workspace">
        <PilotBanner />
        <div className="topbar">
          <div>
            <p className="eyebrow">Internal ops cockpit</p>
            <h1>Gate deployments before trust breaks.</h1>
          </div>
          <label className="source-toggle">
            <span>Synthetic</span>
            <select value={syntheticMode} onChange={(event) => setSyntheticMode(event.target.value as SyntheticMode)}>
              <option value="show">Show synthetic</option>
              <option value="hide">Hide synthetic</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
        </div>

        {view === "stress" ? (
          <Suspense fallback={<div className="panel loading-panel">Loading stress-test cockpit...</div>}>
            <StressTest initialProject={projects[0]} />
          </Suspense>
        ) : (
          <>
            <section className="command-strip">
              <Metric label="Monetized solar" value={`${Math.round(totals.sold).toLocaleString()} kWh`} />
              <Metric label="Monthly revenue" value={`KSh ${Math.round(totals.revenue).toLocaleString()}`} />
              <Metric label="Pledged demand" value={`KSh ${Math.round(totals.pledged).toLocaleString()}`} />
              <Metric label="Active alerts" value={totals.alerts.toString()} />
            </section>

            {error && <div className="notice error">{error}</div>}
            {loading && <div className="notice">Loading real cockpit data...</div>}

            <section className="ops-board">
              <article className="panel wide">
                <div className="row">
                  <div>
                    <p className="eyebrow">Portfolio</p>
                    <h2>Buildings by deployment risk</h2>
                  </div>
                  <span className="note">{filteredProjects.length} visible</span>
                </div>

                <div className="filter-bar">
                  <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as StageFilter)}>
                    <option value="all">All stages</option>
                    {[...new Set(cockpitProjects.map((item) => item.project.stage))].map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                  <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value as DecisionFilter)}>
                    <option value="all">All decisions</option>
                    <option value="deployment_ready">Deployment-ready</option>
                    <option value="review">Review</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  <input aria-label="Settlement from date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                  <input aria-label="Settlement to date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                </div>

                <div className="portfolio-table">
                  <div className="portfolio-head">
                    <strong>Name</strong>
                    <strong>Stage</strong>
                    <strong>DRS</strong>
                    <strong>LBRS</strong>
                    <strong>Pledged</strong>
                    <strong>Last settlement</strong>
                  </div>
                  {filteredProjects.map((item) => {
                    const settlement = settlementDates[item.project.id];
                    return (
                      <button
                        key={item.project.id}
                        className={`portfolio-row ${selectedProject?.project.id === item.project.id ? "active" : ""}`}
                        onClick={() => setSelectedProjectId(item.project.id)}
                        type="button"
                      >
                        <span>
                          <strong>{item.project.name}</strong>
                          <small>{item.project.locationBand}</small>
                        </span>
                        <span>{item.project.stage}</span>
                        <span>
                          <b>{item.drs.score}</b>
                          <em className={`pill ${item.drs.decision}`}>{item.drs.decision}</em>
                        </span>
                        <span>
                          <b>{item.lbrs.score}</b>
                          <em className={`pill ${item.lbrs.decision}`}>{item.lbrs.decision}</em>
                        </span>
                        <span>KSh {Math.round(item.project.prepaidCommittedKes).toLocaleString()}</span>
                        <span>{settlement?.createdAt ? formatDate(settlement.createdAt) : "—"}</span>
                      </button>
                    );
                  })}
                </div>
              </article>

              <article className="panel">
                <p className="eyebrow">Simulator controls</p>
                <h2>Run synthetic scenario</h2>
                <div className="toggle-list">
                  <label className="toggle-row">
                    <span>Lifecycle phase</span>
                    <select value={scenarioPhase} onChange={(event) => setScenarioPhase(event.target.value as SyntheticScenarioPhase)}>
                      {syntheticScenarioPhases.map((phase) => (
                        <option key={phase} value={phase}>
                          {phase.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="toggle-row">
                    <span>Failure injection</span>
                    <select value={scenarioFailureMode} onChange={(event) => setScenarioFailureMode(event.target.value as SyntheticFailureMode)}>
                      {syntheticFailureModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="alert">
                  <strong>{syntheticScenario.title}</strong>
                  <span>
                    {syntheticScenario.phase.replace(/_/g, " ")} · DRS {syntheticScenario.outcomes.drsDecision} · LBRS{" "}
                    {syntheticScenario.outcomes.lbrsDecision}
                  </span>
                </div>
                {comparison ? (
                  <div className="alert">
                    <strong>Outcome comparison</strong>
                    <span>
                      {comparison.delta.settlementRevenueKes.toLocaleString()} KES revenue delta · DRS changed:{" "}
                      {String(comparison.delta.drsChanged)}
                    </span>
                  </div>
                ) : null}
              </article>

              <article className="panel">
                <p className="eyebrow">Alert inbox</p>
                <h2>Blockers</h2>
                {projects
                  .flatMap((item) =>
                    item.drs.reasons.length
                      ? item.drs.reasons.map((reason) => ({ project: item.project.name, reason }))
                      : [{ project: item.project.name, reason: "No active DRS blocker." }],
                  )
                  .map((alert) => (
                    <div className="alert" key={`${alert.project}-${alert.reason}`}>
                      <strong>{alert.project}</strong>
                      <span>{alert.reason}</span>
                    </div>
                  ))}
              </article>
            </section>

            {selectedProject && (
              <BuildingDetail
                project={selectedProject}
                token={session.token}
                syntheticMode={syntheticMode}
                onProjectChange={replaceProject}
              />
            )}
          </>
        )}
      </section>
    </main>
  );
}

function LoginScreen({ onSession }: { onSession: (session: NonNullable<Session>) => void }) {
  const [email, setEmail] = useState("admin@emappa.test");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await requestOtp(email);
      setStep("code");
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await verifyOtp(email, code);
      onSession(session);
    } catch (verifyError) {
      setError((verifyError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Cockpit login</p>
        <h1>Admin OTP</h1>
        <p className="lede">Sign in with an admin seed account. Non-admin roles are rejected after verification.</p>
        <form onSubmit={step === "email" ? handleRequest : handleVerify}>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {step === "code" && (
            <label>
              OTP code
              <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" required />
            </label>
          )}
          {error && <div className="notice error">{error}</div>}
          <button className="primary-action" disabled={loading} type="submit">
            {step === "email" ? "Request OTP" : "Verify OTP"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}
