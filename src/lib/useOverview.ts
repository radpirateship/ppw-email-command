"use client";

import { useEffect, useState } from "react";
import { SUBSCRIBERS, FLOW_STATUS, type OverviewData } from "@/lib/data";

const SEED: OverviewData = {
  subscribers: { ...SUBSCRIBERS },
  flows: { live: null, builtButOff: FLOW_STATUS.builtButOff, missing: FLOW_STATUS.missing, drafts: null },
  source: "seed",
  fetchedAt: "",
};

/** Live Klaviyo overview, falling back to the seed snapshot. `loading` is true until the first response. */
export function useOverview() {
  const [data, setData] = useState<OverviewData>(SEED);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/klaviyo/overview", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: OverviewData) => {
        if (alive && d?.subscribers && d?.flows) setData(d);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { data, loading };
}

export function freshnessLabel(source: "seed" | "live", fetchedAt: string, loading: boolean): string {
  if (loading) return "Loading live numbers from Klaviyo…";
  if (source !== "live") return "Showing saved snapshot (couldn't reach Klaviyo)";
  const t = fetchedAt ? new Date(fetchedAt) : new Date();
  return `Live from Klaviyo · updated ${t.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
