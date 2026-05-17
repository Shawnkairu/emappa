import type { PublicRole } from "@emappa/shared";
import { BuildingOwnerWebOnboarding } from "./building-owner/BuildingOwnerWebOnboarding";
import { ElectricianWebOnboarding } from "./electrician";
import { FinancierWebOnboarding } from "./financier";
import { HomeownerOnboarding } from "./homeowner/HomeownerOnboarding";
import { ProviderWebOnboarding } from "./provider";
import { ResidentWebOnboarding } from "./resident/ResidentWebOnboarding";

export function StakeholderOnboarding({
  role,
  onFinished,
}: {
  role: PublicRole;
  onFinished: () => void | Promise<void>;
}) {
  if (role === "homeowner") {
    return <HomeownerOnboarding onFinished={onFinished} />;
  }
  if (role === "resident") {
    return <ResidentWebOnboarding onFinished={onFinished} />;
  }
  if (role === "building_owner") {
    return <BuildingOwnerWebOnboarding onFinished={onFinished} />;
  }
  if (role === "provider") return <ProviderWebOnboarding onFinished={onFinished} />;
  if (role === "electrician") return <ElectricianWebOnboarding onFinished={onFinished} />;
  if (role === "financier") return <FinancierWebOnboarding onFinished={onFinished} />;
  return null;
}
