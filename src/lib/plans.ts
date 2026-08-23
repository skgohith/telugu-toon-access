import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { listPlans, type PublicPlan } from "@/lib/store.functions";

const PLAN_COLUMNS =
  "id, name, price, duration_days, duration_label, description, features, recommended, active, sort_order";

async function fetchPlansDirect(): Promise<PublicPlan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_COLUMNS)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicPlan[];
}

/**
 * Reads the public plan list. Prefers the server function, but falls back to a
 * direct public read so the pricing page keeps working on hosts where the
 * server-side environment isn't configured (e.g. external deployments).
 */
export async function fetchPlans(): Promise<PublicPlan[]> {
  try {
    const plans = await listPlans();
    if (plans.length > 0) return plans;
  } catch {
    // fall through to the public read below
  }
  return fetchPlansDirect();
}

export const plansQueryOptions = queryOptions({
  queryKey: ["plans"],
  queryFn: fetchPlans,
  staleTime: 60_000,
  retry: 2,
});
