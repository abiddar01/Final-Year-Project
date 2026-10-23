/**
 * Comparison specification config.
 *
 * All comparable specs live here — never inline them in the comparison UI.
 * Adding a new row/section only requires editing this file.
 */
import type { Car } from "@/lib/types";
import { formatPKR, getAvailabilityLabel } from "@/lib/formatPKR";

export type SpecValue = string | number | string[] | null | undefined;

export interface SpecRow {
  label: string;
  /** Raw value pulled from the car record. */
  value: (c: Car) => SpecValue;
  /** Which end of the range is objectively better, when comparable. */
  highlight?: "max" | "min";
  /** Display formatter for numeric values. */
  format?: (v: number) => string;
  /** Renders as a bullet list of feature chips. */
  type?: "list";
}

export interface SpecSection {
  title: string;
  rows: SpecRow[];
}

const int = (suffix: string) => (v: number) => `${Math.round(v).toLocaleString()} ${suffix}`;

export const COMPARE_SECTIONS: SpecSection[] = [
  {
    title: "Basic",
    rows: [
      { label: "Brand", value: (c) => c.brand },
      { label: "Model", value: (c) => c.model },
      { label: "Variant", value: (c) => c.variant },
      { label: "Model Year", value: (c) => c.year, highlight: "max" },
      { label: "Body Type", value: (c) => c.body_type || c.category },
      { label: "Price", value: (c) => c.price, highlight: "min", format: (v) => formatPKR(v) },
      {
        label: "Availability",
        value: (c) => getAvailabilityLabel(c.availability_type || "in_showroom"),
      },
    ],
  },
  {
    title: "Engine & Performance",
    rows: [
      { label: "Engine Capacity", value: (c) => c.engine_size, highlight: "max", format: int("cc") },
      { label: "Engine Type", value: (c) => c.engine_type },
      { label: "Horsepower", value: (c) => c.horsepower, highlight: "max", format: int("HP") },
      { label: "Torque", value: (c) => c.torque, highlight: "max", format: int("Nm") },
      { label: "Transmission", value: (c) => c.transmission },
      { label: "Drivetrain", value: (c) => c.drivetrain },
      { label: "Fuel Type", value: (c) => c.fuel_type },
      { label: "0–100 km/h", value: (c) => c.acceleration, highlight: "min", format: (v) => `${v} sec` },
      { label: "Top Speed", value: (c) => c.top_speed, highlight: "max", format: int("km/h") },
    ],
  },
  {
    title: "Practical",
    rows: [
      { label: "Seating Capacity", value: (c) => c.seats, highlight: "max" },
      { label: "Fuel Tank", value: (c) => c.fuel_tank_capacity, highlight: "max", format: (v) => `${v} L` },
      { label: "Fuel Economy", value: (c) => c.mileage_kmpl, highlight: "max", format: (v) => `${v} km/l` },
      { label: "Boot Capacity", value: (c) => c.boot_capacity, highlight: "max", format: int("L") },
    ],
  },
  {
    title: "Dimensions",
    rows: [
      { label: "Length", value: (c) => c.length_mm, format: int("mm") },
      { label: "Width", value: (c) => c.width_mm, format: int("mm") },
      { label: "Height", value: (c) => c.height_mm, format: int("mm") },
      { label: "Wheelbase", value: (c) => c.wheelbase_mm, highlight: "max", format: int("mm") },
      { label: "Ground Clearance", value: (c) => c.ground_clearance_mm, highlight: "max", format: int("mm") },
    ],
  },
  {
    title: "Features",
    rows: [
      { label: "Safety", value: (c) => c.safety_features, type: "list" },
      { label: "Infotainment", value: (c) => c.infotainment_features, type: "list" },
      { label: "Driver Assistance", value: (c) => c.driver_assistance_features, type: "list" },
      { label: "Comfort", value: (c) => c.comfort_features, type: "list" },
    ],
  },
];

/** Best numeric value for a row across the compared cars, or null when not comparable. */
export function bestValueForRow(row: SpecRow, cars: Car[]): number | null {
  if (!row.highlight || cars.length < 2) return null;
  const nums = cars
    .map((c) => row.value(c))
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length < 2) return null;
  if (nums.every((n) => n === nums[0])) return null;
  return row.highlight === "max" ? Math.max(...nums) : Math.min(...nums);
}

/** True when every compared car has the same value for this row. */
export function rowIsIdentical(row: SpecRow, cars: Car[]): boolean {
  const serialised = cars.map((c) => JSON.stringify(row.value(c) ?? null));
  return serialised.every((v) => v === serialised[0]);
}

/** True when no compared car has data for this row. */
export function rowIsEmpty(row: SpecRow, cars: Car[]): boolean {
  return cars.every((c) => {
    const v = row.value(c);
    if (Array.isArray(v)) return v.length === 0;
    return v === null || v === undefined || v === "";
  });
}
