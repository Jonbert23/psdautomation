export type PlanId = "month" | "half_year" | "year";

export const MONTHLY_AMOUNT = 69900;

export const PLAN_FEATURES = [
  "Garment profiles",
  "PNG presets for every size and part",
  "Layout in the app and in Photoshop",
  "Template guide layer on every job",
  "Production orders and consistent file names",
  "One subscription on this account, on one signed-in PC",
];

export interface Plan {
  id: PlanId;
  name: string;
  months: number;
  discountPercent: number;
  monthlyAmount: number;
  amount: number;
  compareAmount: number;
  currency: "PHP";
  blurb: string;
  features: string[];
}

function termAmount(months: number, discountPercent: number): number {
  return Math.round((MONTHLY_AMOUNT * months * (100 - discountPercent)) / 100);
}

export const PLANS: Plan[] = [
  {
    id: "month",
    name: "1 month",
    months: 1,
    discountPercent: 0,
    monthlyAmount: MONTHLY_AMOUNT,
    compareAmount: MONTHLY_AMOUNT,
    amount: termAmount(1, 0),
    currency: "PHP",
    blurb: "Paying for one month extends your subscription by one month.",
    features: PLAN_FEATURES,
  },
  {
    id: "half_year",
    name: "6 months",
    months: 6,
    discountPercent: 10,
    monthlyAmount: MONTHLY_AMOUNT,
    compareAmount: MONTHLY_AMOUNT * 6,
    amount: termAmount(6, 10),
    currency: "PHP",
    blurb: "Paying for six months extends your subscription by six months, at 10% off.",
    features: PLAN_FEATURES,
  },
  {
    id: "year",
    name: "12 months",
    months: 12,
    discountPercent: 20,
    monthlyAmount: MONTHLY_AMOUNT,
    compareAmount: MONTHLY_AMOUNT * 12,
    amount: termAmount(12, 20),
    currency: "PHP",
    blurb: "Paying for twelve months extends your subscription by twelve months, at 20% off.",
    features: PLAN_FEATURES,
  },
];

export function getPlan(id: string | null | undefined): Plan | null {
  return PLANS.find((plan) => plan.id === id) || null;
}

export function formatPeso(centavos: number): string {
  const pesos = centavos / 100;
  const digits = centavos % 100 === 0 ? 0 : 2;
  return `₱${pesos.toLocaleString("en-PH", { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
}

export function formatPlanPrice(plan: Plan): string {
  const total = formatPeso(plan.amount);
  if (plan.months <= 1) return total;
  return `${total} · ${formatPeso(Math.round(plan.amount / plan.months))}/month`;
}

export function planPayLabel(plan: Plan): string {
  return `Pay for ${plan.name}`;
}

export interface BillingSubscription {
  id: string | null;
  planId: string | null;
  status: string | null;
}

export interface BillingSnapshot {
  subscription: BillingSubscription | null;
  checkoutUrl?: string | null;
  message?: string | null;
}
