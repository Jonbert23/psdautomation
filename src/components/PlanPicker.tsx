import { useState } from "react";
import { PLANS, formatPeso, planPayLabel, type Plan } from "@shared/plans";

export function PlanPicker({
  currentPlanId,
  ctaLabel = "",
  onSelect,
}: {
  currentPlanId?: string | null;
  ctaLabel?: string;
  onSelect: (plan: Plan) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState("");

  async function choose(plan: Plan) {
    setBusyId(plan.id);
    try {
      await onSelect(plan);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="plan-grid">
      {PLANS.map((plan) => {
        const current = currentPlanId === plan.id;
        const busy = busyId === plan.id;
        const monthly = formatPeso(Math.round(plan.amount / plan.months));
        return (
          <article key={plan.id} className={`plan-card${plan.id === "year" ? " featured" : ""}`}>
            <div className="plan-heading">
              <p className="auth-kicker">{plan.name}</p>
              {plan.discountPercent > 0 ? <p className="plan-save">Save {plan.discountPercent}%</p> : null}
            </div>
            <h2>{formatPeso(plan.amount)}</h2>
            {plan.months > 1 ? (
              <p className="plan-compare">
                <s>{formatPeso(plan.compareAmount)}</s>
                {monthly}/month
              </p>
            ) : (
              <p className="plan-compare">Billed once</p>
            )}
            <p className="muted">{plan.blurb}</p>
            <ul className="plan-features">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button className="btn primary" type="button" disabled={busy} onClick={() => void choose(plan)}>
              {busy ? "Starting…" : ctaLabel || planPayLabel(plan)}
            </button>
            {current ? <p className="plan-compare">Current term</p> : null}
          </article>
        );
      })}
    </div>
  );
}
