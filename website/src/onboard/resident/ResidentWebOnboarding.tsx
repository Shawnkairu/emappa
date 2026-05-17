import { useState, type FormEvent } from "react";
import {
  commitPrepaidWeb,
  completeOnboarding,
  joinBuildingWithCode,
} from "../../lib/api";
import { ResidentStep1FindBuilding, type ResidentFindBuildingDraft } from "./step1";
import { ResidentStep2ConfirmBuilding, type ResidentBuildingMatch } from "./step2";
import { ResidentStep3LoadProfile, type ResidentLoadProfileDraft } from "./step3";
import { ResidentStep4CapacityCheck } from "./step4";
import { ResidentStep5PledgeDecision } from "./step5";

const steps = ["Find building", "Confirm", "Load profile", "Capacity", "Pledge decision"];

export function ResidentWebOnboarding({ onFinished }: { onFinished: () => void | Promise<void> }) {
  const [step, setStep] = useState(0);
  const [findDraft, setFindDraft] = useState<ResidentFindBuildingDraft>({ code: "", unitNumber: "", manualAddress: "" });
  const [building, setBuilding] = useState<ResidentBuildingMatch | null>(null);
  const [unitCount, setUnitCount] = useState(1);
  const [loadProfile, setLoadProfile] = useState<ResidentLoadProfileDraft>({
    monthlySpendKes: "",
    applianceProfile: [],
    daytimePattern: "balanced",
    receiptName: "",
  });
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitJoin(event: FormEvent) {
    event.preventDefault();
    const trimmed = findDraft.code.trim();
    const manualAddress = findDraft.manualAddress.trim();
    const unitNumber = findDraft.unitNumber.trim();
    if (!unitNumber) {
      setMessage("Enter your apartment or unit number.");
      return;
    }
    if (trimmed.length < 4 && manualAddress.length < 6) {
      setMessage("Enter an invite code or a manual building address.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (trimmed.length >= 4) {
        const result = await joinBuildingWithCode(trimmed);
        setBuilding({
          id: result.building.id,
          name: result.building.name,
          address: result.building.address,
          unitNumber,
          source: "invite",
        });
        setUnitCount(result.building.unitCount);
      } else {
        setBuilding({
          id: "manual-resident-building",
          name: manualAddress.split(",")[0] ?? "Manual building",
          address: manualAddress,
          unitNumber,
          source: "manual",
        });
        setUnitCount(12);
      }
      setStep(1);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not join that building.");
    } finally {
      setBusy(false);
    }
  }

  async function finish(skipPledge: boolean) {
    if (!building) {
      setMessage("Missing building context.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (!skipPledge) {
        const kes = Number(amount);
        if (!Number.isFinite(kes) || kes <= 0) {
          setMessage("Enter a pledge amount greater than 0 KES, or skip for now.");
          setBusy(false);
          return;
        }
        if (building.source === "invite") {
          await commitPrepaidWeb(building.id, kes);
        }
      }
      await completeOnboarding({
        profile: {
          unitNumber: building.unitNumber,
          buildingAddress: building.address,
          buildingSource: building.source,
          loadProfile: {
            level: "L1",
            monthlySpendKes: Number(loadProfile.monthlySpendKes) || null,
            applianceProfile: loadProfile.applianceProfile,
            daytimePattern: loadProfile.daytimePattern,
            receiptName: loadProfile.receiptName || null,
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

  return (
    <main className="onboard-shell">
      <section className="onboard-card">
        <div className="onboard-header">
          <div>
            <p className="eyebrow">Resident onboarding</p>
            <h1>{steps[step]}</h1>
          </div>
          <span aria-label={`Step ${step + 1} of ${steps.length}`}>
            {step + 1} of {steps.length}
          </span>
        </div>

        {step === 0 ? (
          <ResidentStep1FindBuilding draft={findDraft} busy={busy} onChange={setFindDraft} onSubmit={submitJoin} />
        ) : null}

        {step === 1 && building ? (
          <ResidentStep2ConfirmBuilding building={building} onBack={() => setStep(0)} onConfirm={() => setStep(2)} />
        ) : null}

        {step === 2 ? (
          <ResidentStep3LoadProfile
            draft={loadProfile}
            onBack={() => setStep(1)}
            onChange={setLoadProfile}
            onContinue={() => setStep(3)}
          />
        ) : null}

        {step === 3 ? (
          <ResidentStep4CapacityCheck
            loadProfile={loadProfile}
            unitCount={unitCount}
            onBack={() => setStep(2)}
            onContinue={() => setStep(4)}
          />
        ) : null}

        {step === 4 ? (
          <ResidentStep5PledgeDecision
            amount={amount}
            activated={false}
            busy={busy}
            onAmountChange={setAmount}
            onBack={() => setStep(3)}
            onFinish={finish}
          />
        ) : null}

        {message ? <p className="form-note onboard-message" role="status">{message}</p> : null}
      </section>
    </main>
  );
}
