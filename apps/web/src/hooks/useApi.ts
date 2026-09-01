/** Lightweight data-fetching hooks (TanStack Query-style polling). */
import { useEffect, useState, useCallback } from "react";
import { api, apiError } from "../api/client";

export function useApi<T>(path: string, intervalMs?: number): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get<T>(path)
      .then((r) => { if (active) { setData(r.data); setError(null); } })
      .catch((e) => { if (active) setError(apiError(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, tick]);

  useEffect(() => {
    if (!intervalMs) return;
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return { data, loading, error, refetch };
}

export function useOverview(intervalMs = 3000) {
  return useApi<{ system_healthy: boolean; device_online: boolean; telemetry_fresh: boolean; source_power_w: number; load_power_w: number; import_power_w: number; export_power_w: number; today_energy_wh: number; indicative_carbon_kg: number; active_task: string | null; optimization_opportunity: boolean; recent_savings_wh: number; payment_required: boolean }>("/overview/", intervalMs);
}
