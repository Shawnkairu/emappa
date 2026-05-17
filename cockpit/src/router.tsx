import { useCallback, useEffect, useMemo, useState } from "react";

export type BuildingDetailTab = "overview" | "energy" | "pledges" | "drs" | "lbrs" | "ops" | "settlement" | "roof";

type CockpitRoute =
  | { view: "command" }
  | { view: "stress" }
  | { view: "building"; buildingId: string; tab: BuildingDetailTab };

const detailTabs: BuildingDetailTab[] = ["overview", "energy", "pledges", "drs", "lbrs", "ops", "settlement", "roof"];

export function useCockpitRouter() {
  const [route, setRoute] = useState<CockpitRoute>(() => parseRoute(globalThis.location?.pathname ?? "/"));

  useEffect(() => {
    const handlePopState = () => setRoute(parseRoute(globalThis.location.pathname));
    globalThis.addEventListener("popstate", handlePopState);
    return () => globalThis.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((next: CockpitRoute) => {
    const path = routePath(next);
    globalThis.history.pushState(null, "", path);
    setRoute(next);
  }, []);

  return useMemo(
    () => ({
      route,
      navigateCommand: () => navigate({ view: "command" }),
      navigateStress: () => navigate({ view: "stress" }),
      navigateBuilding: (buildingId: string, tab: BuildingDetailTab = "overview") =>
        navigate({ view: "building", buildingId, tab }),
    }),
    [navigate, route],
  );
}

function parseRoute(pathname: string): CockpitRoute {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "stress") return { view: "stress" };
  if (parts[0] === "buildings" && parts[1]) {
    const tab = detailTabs.includes(parts[2] as BuildingDetailTab) ? (parts[2] as BuildingDetailTab) : "overview";
    return { view: "building", buildingId: parts[1], tab };
  }
  return { view: "command" };
}

function routePath(route: CockpitRoute) {
  if (route.view === "stress") return "/stress";
  if (route.view === "building") {
    return `/buildings/${encodeURIComponent(route.buildingId)}/${route.tab}`;
  }
  return "/";
}
