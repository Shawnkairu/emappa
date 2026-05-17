import { officialPalette } from "@emappa/ui";
import type { OwnershipSegment } from "../shared/OwnershipRingChart";

type OwnershipPosition = {
  percentage?: number;
  shareFraction?: number;
  ownerRole?: string;
};

function positionShare(position: OwnershipPosition) {
  if (typeof position.shareFraction === "number") {
    return position.shareFraction;
  }
  if (typeof position.percentage === "number") {
    return position.percentage > 1 ? position.percentage / 100 : position.percentage;
  }
  return 0;
}

export function homeownerOwnershipSegments(
  positions: OwnershipPosition[],
  retainedShare: number,
): OwnershipSegment[] | null {
  const soldPct = Math.max(0, (1 - retainedShare) * 100);
  if (soldPct < 0.5) {
    return null;
  }

  const segments: OwnershipSegment[] = [
    {
      key: "homeowner",
      label: "You retain",
      pct: retainedShare * 100,
      color: officialPalette.foxOrange,
    },
  ];

  const others = positions.filter((position) => position.ownerRole && position.ownerRole !== "homeowner");
  if (others.length) {
    for (const position of others) {
      const pct = positionShare(position) * 100;
      if (pct <= 0) continue;
      segments.push({
        key: position.ownerRole ?? "other",
        label: formatRole(position.ownerRole),
        pct,
        color: roleColor(position.ownerRole),
      });
    }
  } else {
    segments.push({
      key: "sold",
      label: "Sold to others",
      pct: soldPct,
      color: officialPalette.rustBrown,
    });
  }

  return segments;
}

function formatRole(role?: string) {
  if (!role) return "Other";
  return role.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function roleColor(role?: string) {
  if (role === "provider") return officialPalette.rustBrown;
  if (role === "financier") return officialPalette.studioCocoa;
  if (role === "resident") return officialPalette.espressoShadow;
  return officialPalette.scarfOat;
}
