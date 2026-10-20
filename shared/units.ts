import type { MeasurementUnit } from "./types";

const TO_MM: Record<MeasurementUnit, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
  px: 0,
};

export function convertMeasurement(
  value: number,
  from: MeasurementUnit,
  to: MeasurementUnit,
  ppi = 300,
): number {
  if (from === to) return value;
  if (from === "px" && to === "px") return value;
  const fromMm = from === "px" ? (value / ppi) * 25.4 : value * TO_MM[from];
  if (to === "px") return (fromMm / 25.4) * ppi;
  return fromMm / TO_MM[to];
}
