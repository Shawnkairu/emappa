import { useMemo, useState, type FormEvent } from "react";
import type { BuildingRecord } from "@emappa/shared";
import { apiPostJson, completeOnboarding, geocodeQuery } from "../../lib/api";
import Step1 from "./step1";
import Step2 from "./step2";
import Step3 from "./step3";
import Step4 from "./step4";
import Step5 from "./step5";
import Step6 from "./step6";
import Step7 from "./step7";
import Step8 from "./step8";

export const buildingOwnerSteps = [
  "Welcome",
  "Account verified",
  "Role selected",
  "Building location",
  "Authority",
  "Building profile",
  "Roof capture",
  "Terms preview",
];

export type BuildingOwnerForm = {
  name: string;
  address: string;
  unitCount: string;
  occupancy: string;
  roofArea: number;
  lat: number;
  lon: number;
  formattedAddress: string;
  authorityDoc: string;
  utilityDoc: string;
  reviewerContact: string;
  companyDocsReady: boolean;
  roofType: string;
  roofAccess: string;
  shadedAreas: string;
  meterAreaLocation: string;
  residentPainPoints: string;
  roofCaptureMode: "auto_suggest" | "owner_traced" | "typed_sqm";
  acceptedTerms: boolean;
};

export type BuildingOwnerStepProps = {
  form: BuildingOwnerForm;
  busy: boolean;
  buildingId: string | null;
  setForm: (form: BuildingOwnerForm) => void;
  goToStep: (step: number) => void;
  geocodeAddress: () => void;
  saveBasics: (event: FormEvent) => void;
  saveRoof: (event: FormEvent) => void;
  finish: () => void;
};

const stepScreens = [Step1, Step2, Step3, Step4, Step5, Step6, Step7, Step8];

export function BuildingOwnerWebOnboarding({ onFinished }: { onFinished: () => void | Promise<void> }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [form, setForm] = useState<BuildingOwnerForm>({
    name: "",
    address: "",
    unitCount: "8",
    occupancy: "85",
    roofArea: 120,
    lat: 0,
    lon: 0,
    formattedAddress: "",
    authorityDoc: "",
    utilityDoc: "",
    reviewerContact: "",
    companyDocsReady: false,
    roofType: "",
    roofAccess: "",
    shadedAreas: "",
    meterAreaLocation: "",
    residentPainPoints: "",
    roofCaptureMode: "typed_sqm",
    acceptedTerms: false,
  });
  const progress = useMemo(() => Math.round(((step + 1) / buildingOwnerSteps.length) * 100), [step]);
  const ActiveStep = stepScreens[step] ?? Step1;

  async function geocodeAddress() {
    const q = form.address.trim();
    if (q.length < 4) {
      setMessage("Enter a full address, then blur the field to geocode.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const g = await geocodeQuery(q);
      setForm({ ...form, lat: g.lat, lon: g.lon, formattedAddress: g.formattedAddress, address: g.formattedAddress });
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not geocode that address.");
    } finally {
      setBusy(false);
    }
  }

  async function saveBasics(event: FormEvent) {
    event.preventDefault();
    const units = Number(form.unitCount);
    const occ = Number(form.occupancy);
    if (!form.name.trim()) {
      setMessage("Enter the building name.");
      return;
    }
    if (!form.formattedAddress) {
      setMessage("Geocode the address before continuing.");
      return;
    }
    if (!Number.isInteger(units) || units <= 1) {
      setMessage("Building-owner onboarding is for multi-unit properties.");
      return;
    }
    if (!Number.isFinite(occ) || occ < 0 || occ > 100) {
      setMessage("Occupancy must be between 0 and 100%.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await apiPostJson<{ building: BuildingRecord }>("/buildings", {
        name: form.name.trim(),
        address: form.formattedAddress,
        lat: form.lat,
        lon: form.lon,
        unitCount: units,
        occupancy: occ / 100,
        kind: "apartment",
      });
      setBuildingId(result.building.id);
      setStep(4);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not create building.");
    } finally {
      setBusy(false);
    }
  }

  async function saveRoof(event: FormEvent) {
    event.preventDefault();
    if (!buildingId) {
      setMessage("Missing building.");
      return;
    }
    if (!Number.isFinite(form.roofArea) || form.roofArea < 10) {
      setMessage("Enter a roof area of at least 10 sqm.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await apiPostJson<{ building: BuildingRecord }>(`/buildings/${encodeURIComponent(buildingId)}/roof`, {
        areaM2: form.roofArea,
        source: "owner_typed",
      });
      setStep(7);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not save roof.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setMessage(null);
    try {
      await completeOnboarding({
        profile: {
          buildingOwnerOnboarding: {
            authorityDoc: form.authorityDoc,
            utilityDoc: form.utilityDoc,
            reviewerContact: form.reviewerContact,
            companyDocsReady: form.companyDocsReady,
            roofType: form.roofType,
            roofAccess: form.roofAccess,
            shadedAreas: form.shadedAreas,
            meterAreaLocation: form.meterAreaLocation,
            residentPainPoints: form.residentPainPoints,
            roofCaptureMode: form.roofCaptureMode,
            roofAreaM2: form.roofArea,
          },
        },
      });
      await onFinished();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not finish onboarding.");
    } finally {
      setBusy(false);
    }
  }

  function goToStep(nextStep: number) {
    setMessage(null);
    setStep(Math.min(Math.max(nextStep, 0), buildingOwnerSteps.length - 1));
  }

  return (
    <main className="onboard-shell">
      <section className="onboard-card">
        <div className="onboard-header">
          <div>
            <p className="eyebrow">Building owner onboarding</p>
            <h1>{buildingOwnerSteps[step]}</h1>
          </div>
          <span aria-label={`Step ${step + 1} of ${buildingOwnerSteps.length}`}>
            {step + 1} of {buildingOwnerSteps.length}
          </span>
        </div>
        <div className="onboard-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="onboard-steps" aria-label="Onboarding progress">
          {buildingOwnerSteps.map((label, index) => (
            <span className={index <= step ? "active" : ""} key={label}>{label}</span>
          ))}
        </div>
        <ActiveStep
          form={form}
          busy={busy}
          buildingId={buildingId}
          setForm={setForm}
          goToStep={goToStep}
          geocodeAddress={geocodeAddress}
          saveBasics={saveBasics}
          saveRoof={saveRoof}
          finish={finish}
        />
        {message ? <p className="form-note onboard-message" role="status">{message}</p> : null}
      </section>
    </main>
  );
}
