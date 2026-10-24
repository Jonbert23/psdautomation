import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Category, GarmentProfile } from "@shared/types";
import { emptyProfile } from "@shared/defaults";
import { PROFILE_STEPS, type ProfileStepId, presetCoverage, profileReuseReady, stepStates } from "@shared/steps";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { IdentityStep } from "./profile/IdentityStep";
import { PartsStep } from "./profile/PartsStep";
import { SizesStep } from "./profile/SizesStep";
import { PresetsStep } from "./profile/PresetsStep";
import { LayoutStep } from "./profile/LayoutStep";
import { FieldsStep } from "./profile/FieldsStep";
import { ExportStep } from "./profile/ExportStep";

export function ProfileEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<GarmentProfile>(() => emptyProfile({ categoryId: "tshirt" }));
  const [step, setStep] = useState<ProfileStepId>("identity");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    api()
      .categories.list()
      .then(setCategories)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!id) return;
    api()
      .profiles.get(id)
      .then((found) => {
        if (!found) setError("Profile not found.");
        else setProfile(found);
        setLoaded(true);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const states = useMemo(() => stepStates(profile), [profile]);
  const coverage = useMemo(() => presetCoverage(profile), [profile]);
  const ready = profileReuseReady(profile);
  const stepIndex = PROFILE_STEPS.findIndex((s) => s.id === step);

  function patch(next: Partial<GarmentProfile>) {
    setProfile((p) => ({ ...p, ...next }));
  }

  async function saveDraft() {
    setError("");
    setNotice("");
    try {
      const saved = await api().profiles.save(profile);
      setProfile(saved);
      setNotice("Draft saved. This profile does not lock to a design file.");
      if (!id) navigate(`/profiles/${saved.id}`, { replace: true });
      return saved;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }

  function go(delta: number) {
    const next = PROFILE_STEPS[stepIndex + delta];
    if (next) setStep(next.id);
  }

  if (!loaded) return <p className="muted">Loading profile…</p>;

  return (
    <div className="editor">
      <nav className="editor-steps">
        {PROFILE_STEPS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === step ? "active" : ""}
            onClick={() => setStep(item.id)}
          >
            {item.label}
            <span className={`dot ${states[item.id]}`} />
          </button>
        ))}
      </nav>
      <div className={step === "layout" ? "editor-main layout-fill" : "editor-main"}>
        <PageHeader
          title={id ? "Edit layout" : "New layout"}
          description="Name the garment type and set parts, sizes, presets, and fields."
        />
        {error && <div className="error-banner">{error}</div>}
        {notice && <div className="ok-banner">{notice}</div>}
        {step === "identity" && <IdentityStep profile={profile} categories={categories} onChange={patch} />}
        {step === "parts" && <PartsStep profile={profile} onChange={patch} />}
        {step === "sizes" && <SizesStep profile={profile} onChange={patch} />}
        {step === "presets" && <PresetsStep profile={profile} onChange={patch} />}
        {step === "layout" && <LayoutStep profile={profile} onChange={patch} />}
        {step === "fields" && <FieldsStep profile={profile} onChange={patch} />}
        {step === "export" && <ExportStep profile={profile} onChange={patch} />}
      </div>
      <footer className="editor-foot">
        <button className="btn" disabled={stepIndex === 0} onClick={() => go(-1)}>
          Back
        </button>
        <button className="btn" onClick={() => saveDraft()}>
          Save draft
        </button>
        <div className="grow muted">
          {ready ? (
            <span className="badge ok">Ready to reuse</span>
          ) : (
            <span>
              Required presets {coverage.filled}/{coverage.required}
              {coverage.required === 0 ? " · add parts and sizes" : ""}
            </span>
          )}
        </div>
        {stepIndex < PROFILE_STEPS.length - 1 ? (
          <button className="btn primary" onClick={() => go(1)}>
            Next
          </button>
        ) : (
          <button className="btn primary" onClick={() => saveDraft().then((s) => s && navigate("/profiles"))}>
            Save and close
          </button>
        )}
        <button className="btn" onClick={() => navigate("/profiles")}>
          Close
        </button>
      </footer>
    </div>
  );
}
