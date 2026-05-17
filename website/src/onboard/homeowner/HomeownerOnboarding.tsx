import { useMemo, useState, type FormEvent } from "react";
import type { BuildingRecord } from "@emappa/shared";
import { apiPostJson, completeOnboarding } from "../../lib/api";
import Step1 from "./step1";
import Step2 from "./step2";
import Step3 from "./step3";
import Step4 from "./step4";
import Step5 from "./step5";
import Step6 from "./step6";
import Step7 from "./step7";
import Step8 from "./step8";
import Step9 from "./step9";
import Step10 from "./step10";

export const homeownerSteps = [
  "Welcome",
  "Account verified",
  "Role selected",
  "Property location",
  "Authority",
  "Utility context",
  "Load profile",
  "Site preview",
  "Readiness",
  "Deployment decision",
];

export type HomeownerOnboardingForm = {
  displayName: string;
  name: string;
  address: string;
  propertyType: "single_family" | "maisonette" | "small_compound" | "shop_home";
  roofType: string;
  authorityDoc: string;
  utilityEvidence: string;
  nationalIdReady: boolean;
  siteConsent: boolean;
  meterType: string;
  meterNumber: string;
  monthlySpendKes: number;
  usagePattern: string;
  appliances: string;
  daytimeUsage: string;
  eveningUsage: string;
  criticalLoads: string;
  roofArea: number;
  shadeNotes: string;
  equipmentLocation: string;
  connectivity: string;
  accessNotes: string;
  initiateProject: boolean;
};

export type HomeownerStepProps = {
  form: HomeownerOnboardingForm;
  busy: boolean;
  buildingId: string | null;
  setForm: (form: HomeownerOnboardingForm) => void;
  goToStep: (step: number) => void;
  saveAddress: (event: FormEvent) => void;
  saveRoofCapture: (event: FormEvent) => void;
  finish: (initiateProject: boolean) => void;
};

const stepScreens = [Step1, Step2, Step3, Step4, Step5, Step6, Step7, Step8, Step9, Step10];

export function HomeownerOnboarding({ onFinished }: { onFinished: () => void | Promise<void> }) {
  const [step, setStep] = useState(0);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<HomeownerOnboardingForm>({
    displayName: "",
    name: "My home",
    address: "",
    propertyType: "single_family",
    roofType: "",
    authorityDoc: "",
    utilityEvidence: "",
    nationalIdReady: false,
    siteConsent: false,
    meterType: "prepaid",
    meterNumber: "",
    monthlySpendKes: 3500,
    usagePattern: "Mostly evening with weekend daytime use",
    appliances: "",
    daytimeUsage: "low",
    eveningUsage: "medium",
    criticalLoads: "",
    roofArea: 72,
    shadeNotes: "",
    equipmentLocation: "",
    connectivity: "wifi",
    accessNotes: "",
    initiateProject: false,
  });
  const progress = useMemo(() => Math.round(((step + 1) / homeownerSteps.length) * 100), [step]);
  const ActiveStep = stepScreens[step] ?? Step1;
  const canSaveAddress = form.name.trim().length > 1 && form.address.trim().length > 4;
  const canSaveRoof = Number.isFinite(form.roofArea) && form.roofArea >= 10;

  async function saveAddress(event: FormEvent) {
    event.preventDefault();
    if (!canSaveAddress) {
      setMessage("Add a home name and a usable address to continue.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await apiPostJson<{ building: BuildingRecord }>("/buildings", {
        name: form.name.trim(),
        address: form.address.trim(),
        lat: -1.204,
        lon: 36.92,
        unitCount: 1,
        occupancy: 1,
        kind: "single_family",
      });
      setBuildingId(result.building.id);
      setStep(4);
    } catch {
      setMessage("We could not save the property location. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveRoofCapture(event: FormEvent) {
    event.preventDefault();
    if (!canSaveRoof) {
      setMessage("Roof area should be at least 10 square meters for the demo model.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      if (buildingId) {
        await apiPostJson<{ building: BuildingRecord }>(`/buildings/${encodeURIComponent(buildingId)}/roof`, {
          areaM2: form.roofArea,
          source: "owner_typed",
        });
      }
      setStep(8);
    } catch {
      setMessage("We could not save the site preview. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function finish(initiateProject: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      await completeOnboarding({
        displayName: form.displayName.trim() || undefined,
        profile: {
          homeownerOnboarding: {
            propertyType: form.propertyType,
            roofType: form.roofType,
            authorityDoc: form.authorityDoc,
            utilityEvidence: form.utilityEvidence,
            nationalIdReady: form.nationalIdReady,
            siteConsent: form.siteConsent,
            meterType: form.meterType,
            meterNumber: form.meterNumber,
            monthlySpendKes: form.monthlySpendKes,
            usagePattern: form.usagePattern,
            appliances: form.appliances,
            daytimeUsage: form.daytimeUsage,
            eveningUsage: form.eveningUsage,
            criticalLoads: form.criticalLoads,
            roofAreaM2: form.roofArea,
            shadeNotes: form.shadeNotes,
            equipmentLocation: form.equipmentLocation,
            connectivity: form.connectivity,
            accessNotes: form.accessNotes,
            initiateProject,
          },
        },
      });
      await onFinished();
    } catch {
      setMessage("We could not finish onboarding. Please try once more.");
    } finally {
      setBusy(false);
    }
  }

  function goToStep(nextStep: number) {
    setMessage(null);
    setStep(Math.min(Math.max(nextStep, 0), homeownerSteps.length - 1));
  }

  return (
    <main className="onboard-shell">
      <HomeownerOnboardingStyles />
      <section className="onboard-card">
        <div className="onboard-header">
          <div>
            <p className="eyebrow">Homeowner onboarding</p>
            <h1>{homeownerSteps[step]}</h1>
          </div>
          <span aria-label={`Step ${step + 1} of ${homeownerSteps.length}`}>
            {step + 1} of {homeownerSteps.length}
          </span>
        </div>
        <div className="onboard-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="onboard-steps" aria-label="Onboarding progress">
          {homeownerSteps.map((label, index) => (
            <span className={index <= step ? "active" : ""} key={label}>
              {label}
            </span>
          ))}
        </div>

        <ActiveStep
          form={form}
          busy={busy}
          buildingId={buildingId}
          setForm={setForm}
          goToStep={goToStep}
          saveAddress={saveAddress}
          saveRoofCapture={saveRoofCapture}
          finish={finish}
        />

        {message ? (
          <p className="form-note onboard-message" role="status">
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}

function HomeownerOnboardingStyles() {
  return (
    <style>{`
      .onboard-shell { align-items: center; padding: clamp(16px, 4vw, 32px); }
      .onboard-card { border-radius: 18px; }
      .onboard-header h1 { margin-bottom: 0; letter-spacing: 0 !important; }
      .onboard-progress {
        height: 8px; margin: 20px 0 14px; overflow: hidden; border-radius: 999px;
        background: rgba(180, 89, 55, 0.12);
      }
      .onboard-progress span {
        display: block; height: 100%; border-radius: inherit;
        background: linear-gradient(90deg, #a9482d, #d4654a); transition: width 0.2s ease;
      }
      .homeowner-intro-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .homeowner-intro-grid article, .terms-preview, .pledge-preview {
        padding: 16px; border: 1px solid rgba(180, 89, 55, 0.14); border-radius: 14px;
        background: #ffffff; box-shadow: 0 14px 36px rgba(164, 72, 45, 0.06);
      }
      .homeowner-intro-grid span, .pledge-preview span {
        display: inline-grid; place-items: center; min-width: 28px; min-height: 28px;
        border-radius: 999px; color: #a9482d; background: #fff2ec; font-size: 0.78rem; font-weight: 900;
      }
      .homeowner-intro-grid strong, .homeowner-intro-grid small, .pledge-preview strong, .pledge-preview small { display: block; }
      .homeowner-intro-grid strong, .pledge-preview strong { margin-top: 12px; color: #17110f; }
      .homeowner-intro-grid small, .pledge-preview small { margin-top: 8px; color: #6c5b54; line-height: 1.45; }
      .onboard-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
      .onboard-actions .ghost-action { color: #17110f; background: #ffffff; box-shadow: none; }
      .onboard-pane button:disabled { cursor: not-allowed; opacity: 0.62; box-shadow: none; }
      .roof-map-placeholder {
        position: relative; justify-items: start; align-content: end; min-height: 260px;
        padding: 22px; overflow: hidden; text-align: left;
      }
      .roof-map-placeholder::before {
        content: ""; position: absolute; inset: 20% 22% 24% 28%;
        border: 2px solid rgba(164, 72, 45, 0.42); border-radius: 18px 28px 16px 24px;
        background: rgba(255, 255, 255, 0.38); transform: rotate(-8deg);
      }
      .roof-map-placeholder span, .roof-map-placeholder small { position: relative; display: block; }
      .roof-map-placeholder small { margin-top: 6px; color: #6c5b54; }
      .terms-check { grid-template-columns: auto minmax(0, 1fr); align-items: start; margin-top: 14px; }
      .terms-check input { width: 18px; margin-top: 1px; accent-color: #a9482d; }
      .onboard-message { margin: 16px 0 0; line-height: 1.45; }
      @media (max-width: 760px) {
        .onboard-header { align-items: flex-start; flex-direction: column; }
        .homeowner-intro-grid { grid-template-columns: 1fr; }
        .onboard-actions { justify-content: stretch; }
        .onboard-actions button { flex: 1 1 180px; }
      }
    `}</style>
  );
}
