import { Redirect } from "expo-router";

/** @deprecated Use drs-detail */
export default function HomeownerDrsLegacyRoute() {
  return <Redirect href="/(homeowner)/_embedded/drs-detail" />;
}
