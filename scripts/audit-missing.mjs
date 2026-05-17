#!/usr/bin/env node
// scripts/audit-missing.mjs — P0.4.2 re-audit walker.
//
// Coordinator's instrument for the MISSING-count burndown described in
// docs/BUILD_PLAN.md "Re-auditing MISSING.md". Reads docs/MISSING.md,
// extracts every row whose 2nd column names a file target, checks
// whether each target now exists, and prints a fresh tally + the list
// of rows whose claimed status disagrees with the filesystem.
//
// BUILD_PLAN P0.4.2 specifies the target path as scripts/audit-missing.ts.
// We ship as .mjs to keep the script self-contained (no tsx / no tsc
// step) — pure Node ESM, runs as `node scripts/audit-missing.mjs` or
// via `npm run audit:missing`. Spec deviation logged in commit msg.
//
// Output: human-readable summary on stdout, exit 0 always (the script is
// informational — CI doesn't gate on the count, only on tests).

import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const MISSING_MD = join(REPO_ROOT, "docs", "MISSING.md");

const STATUSES = ["MISSING", "PARTIAL", "STALE", "EXISTS"];

/**
 * Parse one markdown table row of the form:
 *   | <col0> | <target> | <status> | <notes...> |
 *
 * Tables in MISSING.md follow the convention from the doc header:
 *   | Spec | Target | Status | Notes |
 *
 * Some rows use 4 columns, some use 5 (e.g. components catalog adds an
 * extra "Used by" column). We resolve "target" as the column that
 * contains a file-extension-shaped string when present.
 *
 * Returns { target, status, raw } or null if not parseable.
 */
function parseRow(line) {
  if (!line.startsWith("|") || line.includes("---")) return null;
  // strip leading/trailing pipes, split, trim each cell
  const cells = line.slice(1, line.length - (line.endsWith("|") ? 1 : 0))
    .split("|")
    .map((c) => c.trim());
  if (cells.length < 3) return null;

  // Find the cell that LOOKS like a target file path (has an extension
  // and a path separator OR is wrapped in backticks).
  let target = null;
  for (const cell of cells) {
    const stripped = cell.replace(/`/g, "").trim();
    // Accept any path with one of our known extensions, possibly suffixed
    // by parenthetical notes ("(rename …)").
    const match = stripped.match(
      /^([A-Za-z0-9_./\-{}()]+\.(?:tsx?|py|md|json|yaml|cjs|mjs))/,
    );
    if (match) {
      target = match[1];
      break;
    }
  }
  if (!target) return null;

  // Find a status cell — first cell containing one of the legend words
  // (case-insensitive). PARTIAL/STALE/EXISTS may be followed by " —".
  let status = null;
  for (const cell of cells) {
    for (const s of STATUSES) {
      if (new RegExp(`(^|\\s)${s}(\\s|$|\\W)`).test(cell)) {
        status = s;
        break;
      }
    }
    if (status) break;
  }
  if (!status) return null;

  return { target, status, raw: line };
}

function targetLooksLikeRoutePattern(target) {
  // route-style targets like (role)/_embedded/foo.tsx — exists check is
  // path-relative; nothing to skip.
  return target.includes("{N}") || target.includes("<");
}

// Known full-path prefixes — anything starting with one of these is
// treated as repo-relative as-is. Anything else gets each of the
// shorthand prefixes prepended in turn until one resolves.
const FULL_PREFIXES = [
  "mobile/", "website/", "cockpit/", "backend/",
  "packages/", "scripts/", "docs/", ".github/",
];
const SHORTHAND_PREFIXES = [
  "mobile/app/", "mobile/components/", "website/src/", "cockpit/src/",
  "backend/app/", "packages/shared/src/",
];

function candidatePaths(target) {
  const isFullPath = FULL_PREFIXES.some((p) => target.startsWith(p));
  if (isFullPath) return [join(REPO_ROOT, target)];
  return SHORTHAND_PREFIXES.map((p) => join(REPO_ROOT, p, target));
}

function expandBraceTargets(target) {
  // "screens/{home,energy,wallet,profile}.tsx" → 4 paths
  const match = target.match(/^(.*)\{([^}]+)\}(.*)$/);
  if (!match) return [target];
  const [, prefix, options, suffix] = match;
  return options.split(",").map((opt) => `${prefix}${opt.trim()}${suffix}`);
}

function targetExpandsToAtLeastOneFile(target) {
  if (target.includes("<")) return false; // placeholder, can't resolve
  const literals = expandBraceTargets(target);
  for (const lit of literals) {
    let toCheck = [lit];
    if (lit.includes("{N}")) {
      toCheck = [lit.replace("{N}", ""), lit.replace("{N}", "1")];
    }
    for (const variant of toCheck) {
      for (const candidate of candidatePaths(variant)) {
        if (existsSync(candidate)) return true;
      }
    }
  }
  return false;
}

function main() {
  if (!existsSync(MISSING_MD)) {
    console.error(`FATAL: ${MISSING_MD} not found`);
    process.exit(2);
  }

  const lines = readFileSync(MISSING_MD, "utf8").split("\n");
  const rows = [];
  for (const line of lines) {
    const row = parseRow(line);
    if (row) rows.push(row);
  }

  // Tally + per-status drift list.
  const tally = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  const drift = []; // { target, claimed, observed }

  for (const row of rows) {
    tally[row.status]++;
    if (targetLooksLikeRoutePattern(row.target)) continue;
    const observed = targetExpandsToAtLeastOneFile(row.target) ? "EXISTS" : "MISSING";
    if (row.status === "MISSING" && observed === "EXISTS") {
      drift.push({ target: row.target, claimed: "MISSING", observed });
    }
    if (row.status === "EXISTS" && observed === "MISSING") {
      drift.push({ target: row.target, claimed: "EXISTS", observed });
    }
  }

  console.log("MISSING.md re-audit — parsed rows + filesystem check");
  console.log(`  source: ${MISSING_MD}`);
  console.log(`  rows parsed: ${rows.length}`);
  console.log("");
  console.log("Tally per claimed status:");
  for (const s of STATUSES) {
    console.log(`  ${s.padEnd(8)} ${String(tally[s]).padStart(4)}`);
  }
  console.log("");

  if (drift.length === 0) {
    console.log("No drift detected — MISSING.md matches filesystem.");
  } else {
    console.log(`Drift detected (${drift.length} row${drift.length === 1 ? "" : "s"}):`);
    for (const d of drift) {
      console.log(`  ${d.claimed} → ${d.observed}  ${d.target}`);
    }
    console.log("");
    console.log("Reconcile by updating MISSING.md status cells, then re-run.");
  }
}

main();
