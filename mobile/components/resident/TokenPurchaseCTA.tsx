import { useRouter } from "expo-router";
import { ResidentPrimaryButton } from "./ResidentScaffold";

/** Doctrine gate: only render when `canResidentBuyTokens` is true (see resident-home.test). */
export function TokenPurchaseCTA() {
  const router = useRouter();

  return (
    <ResidentPrimaryButton
      onPress={() => router.push("/(resident)/_embedded/token-purchase")}
      accessibilityLabel="Buy or top up solar tokens"
    >
      Buy / top up tokens
    </ResidentPrimaryButton>
  );
}
