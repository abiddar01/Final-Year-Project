/**
 * Cars data-access layer.
 *
 * Every feature (catalogue, comparison, matcher) should read cars through this
 * module — never by querying the database directly from a component.
 *
 * Two interchangeable drivers are supported:
 *  - "supabase" (default): the app's own Lovable Cloud database.
 *  - "rest": an external Node.js/Express API exposing `GET /api/cars` and
 *    `GET /api/cars/:id`. Enable it by setting `VITE_CARS_API_BASE_URL`.
 *
 * Both drivers return the exact same `Car` shape, so swapping the backend
 * later requires no component changes.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Car } from "@/lib/types";

const REST_BASE_URL = import.meta.env.VITE_CARS_API_BASE_URL as string | undefined;

export class CarsServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "CarsServiceError";
  }
}

async function restGet<T>(path: string): Promise<T> {
  const res = await fetch(`${REST_BASE_URL!.replace(/\/$/, "")}${path}`);
  if (!res.ok) throw new CarsServiceError(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

/** Fetch a single car by id. Returns null when it does not exist. */
export async function getCarById(id: string): Promise<Car | null> {
  if (REST_BASE_URL) {
    try {
      return await restGet<Car>(`/api/cars/${id}`);
    } catch (e) {
      throw new CarsServiceError("Could not load this vehicle.", e);
    }
  }
  const { data, error } = await supabase.from("cars").select("*").eq("id", id).maybeSingle();
  if (error) throw new CarsServiceError("Could not load this vehicle.", error);
  return (data as Car | null) ?? null;
}

/**
 * Fetch several cars by id, preserving the order of the ids passed in.
 * Ids that no longer exist are simply omitted.
 */
export async function getCarsByIds(ids: string[]): Promise<Car[]> {
  if (ids.length === 0) return [];

  if (REST_BASE_URL) {
    const results = await Promise.all(
      ids.map((id) => getCarById(id).catch(() => null)),
    );
    return results.filter((c): c is Car => c !== null);
  }

  const { data, error } = await supabase.from("cars").select("*").in("id", ids);
  if (error) throw new CarsServiceError("Could not load the selected vehicles.", error);
  const rows = (data ?? []) as Car[];
  return ids.map((id) => rows.find((c) => c.id === id)).filter((c): c is Car => Boolean(c));
}

/** Fetch the full catalogue. */
export async function listCars(): Promise<Car[]> {
  if (REST_BASE_URL) {
    try {
      return await restGet<Car[]>("/api/cars");
    } catch (e) {
      throw new CarsServiceError("Could not load the catalogue.", e);
    }
  }
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new CarsServiceError("Could not load the catalogue.", error);
  return (data ?? []) as Car[];
}
