import { Redirect } from "expo-router";

/** @deprecated Use deployment-detail */
export default function HomeownerDeploymentLegacyRoute() {
  return <Redirect href="/(homeowner)/_embedded/deployment-detail" />;
}
