import { Redirect } from "expo-router";

/** @deprecated Use compare-bill */
export default function HomeownerCompareTodayLegacyRoute() {
  return <Redirect href="/(homeowner)/_embedded/compare-bill" />;
}
