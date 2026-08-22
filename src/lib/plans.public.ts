import { supabase } from "@/integrations/supabase/client";
import type { PublicPlan } from "@/lib/store.functions";

const PLAN_COLUMNS =
  "id, name, price, duration_days, duration_label, description, features, recommended, active, sort_order";

/**
 * Reads the public plan catalogue straight from the Data API with the publishable
 * key (guarded by the "active plans are public" policy). This works on any host,
 * including deployments where server-only environment variables are unavailable.
 */
export async function listPublicPlans(): Promise<PublicPlan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_COLUMNS)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicPlan[];
}
