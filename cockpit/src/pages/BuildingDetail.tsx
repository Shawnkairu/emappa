import { ImmersiveEnergyHero, ImmersiveProjectHero } from "@emappa/web-immersive";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DrsResult, EnergyReading, OperationalWorkflowSnapshot, PrepaidCommitment, ProjectedBuilding, SettlementPeriod } from "@emappa/shared";
import {
  extractBuildingRecord,
  getDrs,
  getDrsHistory,
  getEnergySeries,
  getEnergyToday,
  getLatestSettlement,
  getPrepaidHistory,
  getProject,
  getSettlementHistory,
  runSettlement,
  updateDrsGates,
  type EnergyToday,
  type DrsSnapshot,
} from "../api";
import { SyntheticBadge, type SyntheticMode } from "../components/SyntheticBadge";

type Tab = "overview" | "energy" | "pledges" | "drs" | "lbrs" | "ops" | "settlement" | "roof" | "stakeholders";

type Props = {
  project: ProjectedBuilding;
  token: string;
  syntheticMode: SyntheticMode;
  onProjectChange: (project: ProjectedBuilding) => void;
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "energy", label: "Energy" },
  { id: "pledges", label: "Pledges" },
  { id: "drs", label: "DRS" },
  { id: "lbrs", label: "LBRS" },
  { id: "ops", label: "Ops" },
  { id: "settlement", label: "Settlement" },
  { id: "roof", label: "Roof" },
  { id: "stakeholders", label: "Stakeholders" },
];

const defaultTab: Tab = "overview";

const gateLabels: Array<{ key: string; label: string }> = [
  { key: "hasPrepaidFunds", label: "Prepaid committed" },
  { key: "ownerPermissionsComplete", label: "Owner permissions" },
  { key: "hasVerifiedSupplierQuote", label: "Supplier quote verified" },
  { key: "hasCertifiedLeadElectrician", label: "Certified electrician assigned" },
  { key: "monitoringConnectivityResolved", label: "Monitoring ready" },
  { key: "settlementDataTrusted", label: "Settlement data trusted" },
];

export function BuildingDetail({ project, token, syntheticMode, onProjectChange }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(() => readTabRoute() ?? defaultTab);
  const [sourceMode, setSourceMode] = useState<"synthetic" | "measured" | "both">("both");
  const [today, setToday] = useState<EnergyToday | null>(null);
  const [series, setSeries] = useState<EnergyReading[]>([]);
  const [pledges, setPledges] = useState<PrepaidCommitment[]>([]);
  const [drs, setDrs] = useState<DrsResult | null>(project.drs);
  const [drsHistory, setDrsHistory] = useState<DrsSnapshot[]>([]);
  const [latestSettlement, setLatestSettlement] = useState<SettlementPeriod | null>(null);
  const [settlements, setSettlements] = useState<SettlementPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const building = extractBuildingRecord(project);
  const source = building.dataSource ?? "synthetic";

  useEffect(() => {
    let alive = true;
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 30);

    setError(null);
    Promise.all([
      getEnergyToday(project.project.id, token),
      getEnergySeries(project.project.id, token, "generation", from.toISOString(), now.toISOString()),
      getPrepaidHistory(project.project.id, token),
      getDrs(project.project.id, token),
      getDrsHistory(project.project.id, token).catch(() => []),
      getLatestSettlement(project.project.id, token),
      getSettlementHistory(project.project.id, token),
    ])
      .then(([todayData, seriesData, pledgeData, drsData, drsSnapshots, latest, history]) => {
        if (!alive) return;
        setToday(todayData);
        setSeries(seriesData);
        setPledges(pledgeData);
        setDrs(drsData);
        setDrsHistory(drsSnapshots);
        setLatestSettlement(latest);
        setSettlements(history);
      })
      .catch((detailError: Error) => {
        if (alive) setError(detailError.message);
      });

    return () => {
      alive = false;
    };
  }, [project.project.id, token]);

  useEffect(() => {
    function syncTabRoute() {
      setActiveTab(readTabRoute() ?? defaultTab);
    }

    syncTabRoute();
    globalThis.addEventListener?.("hashchange", syncTabRoute);
    globalThis.addEventListener?.("popstate", syncTabRoute);
    return () => {
      globalThis.removeEventListener?.("hashchange", syncTabRoute);
      globalThis.removeEventListener?.("popstate", syncTabRoute);
    };
  }, []);

  const filteredSeries = useMemo(() => {
    if (sourceMode === "both") return series;
    return series.filter((reading) => reading.source === sourceMode);
  }, [series, sourceMode]);

  const todayRows = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      generation: today?.generation_kwh[hour] ?? 0,
      load: today?.load_kwh[hour] ?? 0,
      irradiance: today?.irradiance_w_m2[hour] ?? 0,
    }));
  }, [today]);

  async function toggleGate(key: string, value: boolean) {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      await updateDrsGates(project.project.id, { [key]: value }, token);
      const [freshProject, freshDrs] = await Promise.all([getProject(project.project.id, token), getDrs(project.project.id, token)]);
      onProjectChange(freshProject);
      setDrs(freshDrs);
      setMessage("DRS gate saved and score refreshed.");
    } catch (toggleError) {
      setError((toggleError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunSettlement() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await runSettlement(project.project.id, token);
      setLatestSettlement(result.period);
      setSettlements((current) => [result.period, ...current.filter((item) => item.id !== result.period.id)]);
      setMessage(`New simulated settlement created for ${formatDate(result.period.createdAt)}.`);
    } catch (settlementError) {
      setError((settlementError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function selectTab(nextTab: Tab) {
    setActiveTab(nextTab);
    writeTabRoute(nextTab);
  }

  return (
    <article className="detail-shell">
      <div className="detail-header">
        <div>
          <p className="eyebrow">Building detail</p>
          <h2>{project.project.name}</h2>
          <span>{building.address ?? project.project.locationBand}</span>
        </div>
        <div className="detail-actions">
          <SyntheticBadge source={source} mode={syntheticMode} />
          <span className={`pill ${project.drs.decision}`}>{project.drs.decision}</span>
        </div>
      </div>

      <div className="tab-strip" role="tablist" aria-label="Building detail tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            aria-controls={`building-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "active" : ""}
            data-permalink={`#${tab.id}`}
            id={`building-tab-trigger-${tab.id}`}
            onClick={() => selectTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      {activeTab === "overview" && (
        <div id="building-tab-overview" role="tabpanel" aria-labelledby="building-tab-trigger-overview">
          <ImmersiveProjectHero project={project} mode="building_owner" />
          <section className="detail-grid">
          <MetricCard label="Pledged total" value={kes(project.project.prepaidCommittedKes)} />
          <MetricCard label="Projected revenue" value={kes(project.settlement.revenue)} />
          <MetricCard label="DRS score" value={`${drs?.score ?? project.drs.score}`} />
          <MetricCard label="LBRS" value={project.lbrs.label} />
          <MetricCard label="Last settlement" value={latestSettlement ? formatDate(latestSettlement.createdAt) : "—"} />

          <div className="panel wide">
            <div className="row">
              <div>
                <p className="eyebrow">Source control</p>
                <h2>Data visibility</h2>
              </div>
              <select value={sourceMode} onChange={(event) => setSourceMode(event.target.value as typeof sourceMode)}>
                <option value="both">Both</option>
                <option value="synthetic">Synthetic</option>
                <option value="measured">Measured</option>
              </select>
            </div>
            <p className="lede">
              Operators can isolate synthesized readings from measured telemetry before approving DRS and settlement decisions.
            </p>
            <div className="metrics">
              <MetricCard label="Monetized solar" value={kwh(project.energy.E_sold)} />
              <MetricCard label="Waste" value={kwh(project.energy.E_waste)} />
              <MetricCard label="Utilization" value={`${Math.round(project.energy.utilization * 100)}%`} />
              <MetricCard label="Funding" value={`${Math.round(project.fundingProgress * 100)}%`} />
            </div>
          </div>
        </section>
        </div>
      )}

      {activeTab === "energy" && (
        <div id="building-tab-energy" role="tabpanel" aria-labelledby="building-tab-trigger-energy">
          <ImmersiveEnergyHero project={project} energyToday={today} variant="building" />
          <section className="detail-grid two">
          <ChartPanel title="24h energy profile" source={source} mode={syntheticMode}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={todayRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="generation" stackId="1" stroke="#f97316" fill="#fed7aa" name="Solar" />
                <Area type="monotone" dataKey="load" stackId="2" stroke="#334155" fill="#cbd5e1" name="Load" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="30d generation series" source={seriesSource(filteredSeries, source)} mode={syntheticMode}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={filteredSeries.map((reading) => ({ date: formatShortDate(reading.timestamp), kwh: reading.value }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={28} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="kwh" stroke="#f97316" strokeWidth={2} dot={false} name="kWh" />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>
        </section>
        </div>
      )}

      {activeTab === "pledges" && (
        <section className="panel" id="building-tab-pledges" role="tabpanel" aria-labelledby="building-tab-trigger-pledges">
          <p className="eyebrow">Pledge history</p>
          <h2>Resident demand backing this deployment</h2>
          <DataTable
            columns={["Date", "User", "Amount", "Status"]}
            rows={pledges.map((pledge) => [
              formatDate(pledge.createdAt),
              pledge.userId,
              kes(pledge.amountKes),
              pledge.status,
            ])}
            empty="No pledge history returned by the backend."
          />
        </section>
      )}

      {activeTab === "drs" && (
        <div id="building-tab-drs" role="tabpanel" aria-labelledby="building-tab-trigger-drs">
          <ImmersiveProjectHero project={project} mode="provider" />
          <section className="detail-grid two">
          <div className="panel">
            <p className="eyebrow">Current DRS</p>
            <h2>{drs?.score ?? project.drs.score} / 100</h2>
            <span className={`pill ${drs?.decision ?? project.drs.decision}`}>{drs?.decision ?? project.drs.decision}</span>
            <div className="alert-stack">
              {(drs?.reasons ?? project.drs.reasons).length ? (
                (drs?.reasons ?? project.drs.reasons).map((reason) => (
                  <div className="alert" key={reason}>
                    <strong>Blocker</strong>
                    <span>{reason}</span>
                  </div>
                ))
              ) : (
                <div className="alert">
                  <strong>No active blockers</strong>
                  <span>All current DRS checks are passing.</span>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <p className="eyebrow">Admin gate controls</p>
            <h2>Flip only contract-backed gates</h2>
            <div className="toggle-list">
              {gateLabels.map((gate) => (
                <label key={gate.key} className="toggle-row">
                  <span>{gate.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean((project.project.drs as unknown as Record<string, boolean>)[gate.key])}
                    disabled={loading}
                    onChange={(event) => toggleGate(gate.key, event.target.checked)}
                  />
                </label>
              ))}
            </div>
          </div>

          <ChartPanel title={drsHistory.length ? "DRS history" : "Current component breakdown"} source={source} mode={syntheticMode}>
            <ResponsiveContainer width="100%" height={260}>
              {drsHistory.length ? (
                <LineChart data={drsHistory.map((snapshot) => ({
                  date: formatShortDate(snapshot.createdAt ?? snapshot.at ?? new Date().toISOString()),
                  score: snapshot.score,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={2} />
                </LineChart>
              ) : (
                <BarChart data={Object.entries(drs?.components ?? project.drs.components).map(([name, value]) => ({ name, value }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartPanel>
        </section>
        </div>
      )}

      {activeTab === "lbrs" && (
        <div id="building-tab-lbrs" role="tabpanel" aria-labelledby="building-tab-trigger-lbrs">
          <ImmersiveProjectHero project={project} mode="lbrs" />
          <section className="detail-grid two">
          <div className="panel">
            <p className="eyebrow">Live Building Readiness</p>
            <h2>{project.lbrs.score} / 100</h2>
            <span className={`pill ${project.lbrs.decision}`}>{project.lbrs.decision}</span>
            <p className="lede">Go-live requires every critical LBRS test to pass — display score is informational only.</p>
            <div className="alert-stack">
              {project.lbrs.reasons.length ? (
                project.lbrs.reasons.map((reason) => (
                  <div className="alert" key={reason}>
                    <strong>Blocker</strong>
                    <span>{reason}</span>
                  </div>
                ))
              ) : (
                <div className="alert">
                  <strong>No LBRS blockers</strong>
                  <span>All critical launch tests are passing for this snapshot.</span>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <p className="eyebrow">Launch checklist</p>
            <h2>Critical tests</h2>
            <div className="toggle-list">
              {project.lbrs.checklist.map((item) => (
                <div className="settlement-row" key={item.id}>
                  <span>
                    {item.label}
                    {item.critical ? " · critical" : ""}
                  </span>
                  <strong className={item.complete ? "good" : "bad"}>{item.complete ? "pass" : "fail"}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="panel wide">
            <p className="eyebrow">Settlement pools (from E_sold)</p>
            <h2>Stakeholder claim mapping</h2>
            <div className="waterfall-grid">
              <MetricCard label="Reserve" value={kes(project.settlement.reserve)} />
              <MetricCard label="Providers" value={kes(project.settlement.providerPool)} />
              <MetricCard label="Financiers / infra" value={kes(project.settlement.financierPool)} />
              <MetricCard label="Building owner host" value={kes(project.settlement.ownerRoyalty)} />
              <MetricCard label="e.mappa" value={kes(project.settlement.emappaFee)} />
              {(project.settlement.shortfallKes ?? 0) > 0 && (
                <MetricCard label="Shortfall (scaled)" value={kes(project.settlement.shortfallKes ?? 0)} />
              )}
            </div>
            <p className="lede">
              Payback uses monetized revenue only. Financier count changes per-person payout, not physics duration for a fixed pool.
            </p>
          </div>
        </section>
        </div>
      )}

      {activeTab === "ops" && (
        <section className="detail-grid two" id="building-tab-ops" role="tabpanel" aria-labelledby="building-tab-trigger-ops">
          <div className="panel">
            <p className="eyebrow">Imported scenario operations</p>
            <h2>Prototype workflow status</h2>
            <p className="lede">
              These rows make Scenario A-F blockers visible without claiming production escrow, KYC, or AI integrations.
            </p>
            <DataTable
              columns={["Workflow", "Status", "Owner"]}
              rows={project.operationalWorkflows.map((item) => [
                item.label,
                item.status.replace(/_/g, " "),
                item.ownerRole,
              ])}
              empty="No operational workflow snapshot was returned."
            />
          </div>
          <div className="panel">
            <p className="eyebrow">Evidence queue</p>
            <h2>Traceability notes</h2>
            <div className="toggle-list">
              {project.operationalWorkflows.map((item) => (
                <div className="settlement-row" key={item.id}>
                  <span>
                    {item.evidenceLabel}
                    {item.prototypeScope ? " · prototype" : ""}
                  </span>
                  <strong className={statusClass(item)}>{item.detail}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "settlement" && (
        <section className="detail-grid two" id="building-tab-settlement" role="tabpanel" aria-labelledby="building-tab-trigger-settlement">
          <div className="panel">
            <div className="row">
              <div>
                <p className="eyebrow">Latest period</p>
                <h2>{latestSettlement ? kes(latestSettlement.revenueKes) : "No settlement yet"}</h2>
              </div>
              <button className="primary-action" disabled={loading} onClick={handleRunSettlement} type="button">
                Run new settlement
              </button>
            </div>
            {latestSettlement && (
              <>
                <span className="simulation-banner">simulation={String(latestSettlement.simulation)}</span>
                <div className="waterfall-grid">
                  {Object.entries(latestSettlement.payouts).map(([name, amount]) => (
                    <MetricCard key={name} label={name} value={kes(amount)} />
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="panel">
            <p className="eyebrow">Settlement history</p>
            <h2>Latest runs</h2>
            <DataTable
              columns={["Created", "Revenue", "Source", "Simulation"]}
              rows={settlements.map((item) => [formatDate(item.createdAt), kes(item.revenueKes), item.dataSource, String(item.simulation)])}
              empty="No settlement history returned by the backend."
            />
          </div>
        </section>
      )}

      {activeTab === "roof" && (
        <section className="detail-grid two" id="building-tab-roof" role="tabpanel" aria-labelledby="building-tab-trigger-roof">
          <div className="panel">
            <p className="eyebrow">Roof polygon</p>
            <h2>{building.roofAreaM2 ? `${Math.round(building.roofAreaM2).toLocaleString()} m²` : "Area unavailable"}</h2>
            <p className="lede">
              Source: {building.roofSource ?? "—"} · Confidence:{" "}
              {typeof building.roofConfidence === "number" ? `${Math.round(building.roofConfidence * 100)}%` : "—"}
            </p>
            <RoofPreview polygon={building.roofPolygonGeojson} lat={building.lat} lon={building.lon} />
          </div>
          <div className="panel">
            <p className="eyebrow">Location metadata</p>
            <h2>{building.address ?? "No address returned"}</h2>
            <div className="settlement-row">
              <span>Latitude</span>
              <strong>{building.lat ?? "—"}</strong>
            </div>
            <div className="settlement-row">
              <span>Longitude</span>
              <strong>{building.lon ?? "—"}</strong>
            </div>
            <div className="settlement-row">
              <span>Units</span>
              <strong>{building.unitCount ?? project.project.units}</strong>
            </div>
          </div>
        </section>
      )}

      {activeTab === "stakeholders" && (
        <section className="detail-grid two" id="building-tab-stakeholders" role="tabpanel" aria-labelledby="building-tab-trigger-stakeholders">
          <div className="panel">
            <p className="eyebrow">Stakeholders</p>
            <h2>Counterparty directory</h2>
            <p className="lede">
              Owner, resident, provider, electrician, and financier records for this building resolve through the operations directory.
            </p>
          </div>
          <div className="panel">
            <p className="eyebrow">Current roster</p>
            <h2>{project.project.name}</h2>
            <div className="settlement-row">
              <span>Operational workflows</span>
              <strong>{project.operationalWorkflows.length}</strong>
            </div>
            <div className="settlement-row">
              <span>Units</span>
              <strong>{building.unitCount ?? project.project.units}</strong>
            </div>
          </div>
        </section>
      )}
    </article>
  );
}

function ChartPanel({
  title,
  children,
  source,
  mode,
}: {
  title: string;
  children: ReactNode;
  source: string;
  mode: SyntheticMode;
}) {
  return (
    <div className="panel chart-panel">
      <div className="row">
        <div>
          <p className="eyebrow">Chart</p>
          <h2>{title}</h2>
        </div>
        <SyntheticBadge source={source} mode={mode} />
      </div>
      {children}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DataTable({ columns, rows, empty }: { columns: string[]; rows: string[][]; empty: string }) {
  if (!rows.length) return <p className="lede">{empty}</p>;
  return (
    <div className="data-table">
      <div className="data-table-head" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
        {columns.map((column) => (
          <strong key={column}>{column}</strong>
        ))}
      </div>
      {rows.map((row) => (
        <div className="data-table-row" key={row.join("-")} style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
          {row.map((cell) => (
            <span key={cell}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

function RoofPreview({
  polygon,
  lat,
  lon,
}: {
  polygon?: { type: "Polygon"; coordinates: number[][][] };
  lat?: number;
  lon?: number;
}) {
  const key = (import.meta as unknown as { env?: { VITE_GOOGLE_MAPS_STATIC_KEY?: string } }).env?.VITE_GOOGLE_MAPS_STATIC_KEY;
  const backgroundImage = key && lat && lon
    ? `url(https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lon}&zoom=20&size=640x420&maptype=satellite&key=${key})`
    : undefined;
  const points = polygonToPoints(polygon);

  return (
    <div className="roof-preview" style={{ backgroundImage }}>
      <svg viewBox="0 0 100 100" aria-label="Roof polygon preview" role="img">
        {points ? <polygon points={points} /> : <text x="50" y="50" textAnchor="middle">No polygon</text>}
      </svg>
    </div>
  );
}

function polygonToPoints(polygon?: { type: "Polygon"; coordinates: number[][][] }) {
  const ring = polygon?.coordinates?.[0];
  if (!ring?.length) return null;
  const xs = ring.map((point) => point[0]);
  const ys = ring.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return ring
    .map(([x, y]) => {
      const px = ((x - minX) / Math.max(maxX - minX, 0.000001)) * 72 + 14;
      const py = 86 - ((y - minY) / Math.max(maxY - minY, 0.000001)) * 72;
      return `${px},${py}`;
    })
    .join(" ");
}

function seriesSource(readings: EnergyReading[], fallback: string) {
  if (!readings.length) return fallback;
  const sources = new Set(readings.map((reading) => reading.source));
  return sources.size > 1 ? "mixed" : [...sources][0];
}

function statusClass(item: OperationalWorkflowSnapshot) {
  if (item.status === "ready") return "good";
  if (item.status === "blocked") return "bad";
  return "";
}

function readTabRoute(): Tab | null {
  const hash = globalThis.location?.hash.replace("#", "");
  return tabs.some((tab) => tab.id === hash) ? (hash as Tab) : null;
}

function writeTabRoute(tab: Tab) {
  if (!globalThis.location || !globalThis.history) return;
  const next = new URL(globalThis.location.href);
  next.hash = tab;
  globalThis.history.pushState(null, "", next);
}

function kes(value: number) {
  return `KSh ${Math.round(value).toLocaleString()}`;
}

function kwh(value: number) {
  return `${Math.round(value).toLocaleString()} kWh`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}
