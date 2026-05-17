const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../../..");
const issues = [];

const publicRoles = ["resident", "homeowner", "building_owner", "provider", "electrician", "financier"];
const sections = {
  resident: ["home", "energy", "wallet", "profile"],
  homeowner: ["home", "energy", "wallet", "profile"],
  building_owner: ["home", "energy", "wallet", "profile"],
  provider: ["discover", "projects", "generation", "wallet", "profile"],
  electrician: ["discover", "projects", "wallet", "profile"],
  financier: ["discover", "portfolio", "generation", "wallet", "profile"],
};

const mobileRoleFolder = {
  resident: "(resident)",
  homeowner: "(homeowner)",
  building_owner: "(building-owner)",
  provider: "(provider)",
  electrician: "(electrician)",
  financier: "(financier)",
};

const websiteRoleFolder = {
  resident: "resident",
  homeowner: "homeowner",
  building_owner: "building-owner",
  provider: "provider",
  electrician: "electrician",
  financier: "financier",
};

function assertFile(relativePath, label) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) {
    issues.push(`${label}: missing ${relativePath}`);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".expo" || entry.name === ".turbo") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (full.includes(`${path.sep}claude design hov1${path.sep}`)) continue;
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function rel(file) {
  return path.relative(repoRoot, file);
}

/** Mobile IA uses `projects`; web loaders/screens remain `jobs` until IA-U10 web parity updates. */
function electricianWebStakeholderFilename(role, section) {
  if (role === "electrician" && section === "projects") return "jobs";
  return section;
}

function auditRouteParity() {
  const websiteApp = read("website/src/App.tsx");
  const webApi = read("website/src/lib/api.ts");
  const roleTabs = read("mobile/components/RoleTabs.tsx");

  for (const role of publicRoles) {
    for (const section of sections[role]) {
      assertFile(`mobile/app/${mobileRoleFolder[role]}/${section}.tsx`, `IA-U10 mobile ${role}/${section}`);
      const webScreenFile = electricianWebStakeholderFilename(role, section);
      assertFile(
        `website/src/screens/stakeholders/${websiteRoleFolder[role]}/${webScreenFile}.tsx`,
        `IA-U10 web ${role}/${webScreenFile}`,
      );

      const loaderKey = electricianWebStakeholderFilename(role, section);
      const rolePattern = new RegExp(`${role}\\s*:\\s*\\{[\\s\\S]*?${loaderKey}\\s*:\\s*lazy\\(`);
      if (!rolePattern.test(websiteApp)) {
        issues.push(`IA-U10 web loader: ${role}/${section} missing from screenLoaders`);
      }
    }
  }

  if (!roleTabs.includes("getMobileSections(role)")) {
    issues.push("IA-U10 mobile: RoleTabs is not driven by getMobileSections(role)");
  }

  for (const needle of ["getRoleHome(role)", "getProjects()", "getEnergyToday", "getWalletBalance"]) {
    if (!webApi.includes(needle)) {
      issues.push(`IA-U10 web data path: loadPortalData missing ${needle}`);
    }
  }
}

function auditPilotLabels() {
  const required = [
    ["mobile/components/PilotBanner.tsx", ["Pledges are non-binding", "no money is charged", "synthetic data"]],
    ["website/src/portal/PortalWidgets.tsx", ["pledges are non-binding", "energy data may be synthesized", "no money is charged"]],
    ["cockpit/src/components/PilotBanner.tsx", ["synthesized energy data", "non-binding pledges", "simulated settlements"]],
    ["packages/web-immersive/src/ImmersiveEnergyHero.tsx", ["Pilot · synthetic"]],
    ["packages/web-immersive/src/ImmersiveProjectHero.tsx", ["Pilot · named deal", "Pilot · go-live readiness", "Pilot · projects"]],
    ["packages/shared/src/types.ts", ['source: "synthetic" | "measured"', 'dataSource: "synthetic" | "measured" | "mixed"']],
  ];

  for (const [file, needles] of required) {
    const body = read(file);
    for (const needle of needles) {
      if (!body.includes(needle)) {
        issues.push(`IA-U6 pilot label: ${file} missing "${needle}"`);
      }
    }
  }
}

function auditObviousInertControls() {
  const files = [
    ...walk(path.join(repoRoot, "mobile/app")),
    ...walk(path.join(repoRoot, "mobile/components")),
    ...walk(path.join(repoRoot, "website/src")),
    ...walk(path.join(repoRoot, "cockpit/src")),
    ...walk(path.join(repoRoot, "packages/web-immersive/src")),
  ];

  for (const file of files) {
    const body = fs.readFileSync(file, "utf8");
    if (body.includes('href="#"') || body.includes("href='#'")) {
      issues.push(`IA-U5 inert link: ${rel(file)} contains href="#"`);
    }

    for (const match of body.matchAll(/<button\b/g)) {
      const snippet = body.slice(match.index, match.index + 800);
      const isSubmit = /type=["']submit["']/.test(snippet);
      const hasHandler = /onClick=/.test(snippet);
      const isStaticDisabled = /\bdisabled\b/.test(snippet);
      if (!isSubmit && !hasHandler && !isStaticDisabled) {
        issues.push(`IA-U5 inert button: ${rel(file)} has <button> without onClick/type=submit`);
      }
    }

    for (const match of body.matchAll(/<Pressable\b([\s\S]*?)>/g)) {
      const attrs = match[1];
      const hasHandler = /onPress=/.test(attrs);
      const linkChild = /accessibilityRole=["']link["']/.test(attrs);
      if (!hasHandler && !linkChild) {
        issues.push(`IA-U5 inert Pressable: ${rel(file)} has Pressable without onPress`);
      }
    }
  }
}

auditRouteParity();
auditPilotLabels();
auditObviousInertControls();

if (issues.length) {
  for (const issue of issues) console.error(issue);
  process.exit(1);
}

console.log("UI compliance audit passed: IA-U5 controls, IA-U6 labels, IA-U10 route/data parity.");
