import type { PublicRole } from "@emappa/shared";
import { ElectricianWebOnboarding } from "../electrician";
import { FinancierWebOnboarding } from "../financier";
import { ProviderWebOnboarding } from "../provider";

export function ContributorWebOnboarding({
  role,
  onFinished,
}: {
  role: Extract<PublicRole, "provider" | "electrician" | "financier">;
  onFinished: () => void | Promise<void>;
}) {
  if (role === "provider") return <ProviderWebOnboarding onFinished={onFinished} />;
  if (role === "electrician") return <ElectricianWebOnboarding onFinished={onFinished} />;
  return <FinancierWebOnboarding onFinished={onFinished} />;
}
