import { Redirect } from "expo-router";

/** @deprecated Use terms-detail */
export default function HomeownerTermsLegacyRoute() {
  return <Redirect href="/(homeowner)/_embedded/terms-detail" />;
}
