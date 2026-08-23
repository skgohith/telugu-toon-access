import { queryOptions } from "@tanstack/react-query";

import { listPlans, type PublicPlan } from "@/lib/store.api";

/** Public plan list — read directly from the backend, works on any host. */
export async function fetchPlans(): Promise<PublicPlan[]> {
  return listPlans();
}

export const plansQueryOptions = queryOptions({
  queryKey: ["plans"],
  queryFn: fetchPlans,
  staleTime: 60_000,
  retry: 2,
});
