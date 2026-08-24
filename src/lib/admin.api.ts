/**
 * Admin data access — runs in the browser against the backend Data API with the
 * signed-in admin's session. Row-level security only lets users with the admin
 * role read/write these tables, and approval / bulk-delete go through database
 * functions that re-check the role. Works on any host, no server env needed.
 */
import { supabase } from "@/integrations/supabase/client";

export type AdminOrder = {
  id: string;
  order_ref: string;
  user_id: string | null;
  plan_name: string;
  coupon_code: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  instagram_username: string;
  telegram_username: string;

  original_amount: number;
  discount_amount: number;
  final_amount: number;
  utr: string | null;
  proof_path: string | null;
  payment_status: "pending" | "completed" | "rejected";
  telegram_access: boolean;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  access_email_status: "not_sent" | "sending" | "sent" | "failed" | "suppressed";
  access_email_error: string | null;
  access_email_attempts: number;
  access_email_sent_at: string | null;
};

export type AdminCoupon = {
  id: string;
  code: string;
  plan_id: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

export type AdminPlan = {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  duration_label: string;
  description: string;
  features: string[];
  active: boolean;
  recommended: boolean;
  sort_order: number;
};

const ADMIN_ORDER_COLUMNS =
  "id, order_ref, user_id, plan_name, coupon_code, customer_name, customer_email, customer_phone, instagram_username, telegram_username, original_amount, discount_amount, final_amount, utr, proof_path, payment_status, telegram_access, approved_at, rejected_at, created_at, access_email_status, access_email_error, access_email_attempts, access_email_sent_at";

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

export async function adminOverview() {
  const [{ data: orders, error }, { data: coupons }, { data: profiles }] = await Promise.all([
    supabase
      .from("orders")
      .select("order_ref, plan_name, coupon_code, final_amount, payment_status, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("coupons").select("code, used_count"),
    supabase.from("profiles").select("id"),
  ]);
  if (error) throw new Error(error.message);

  const list = orders ?? [];
  const completed = list.filter((o) => o.payment_status === "completed");
  const revenue = completed.reduce((sum, o) => sum + Number(o.final_amount), 0);

  const byMonth = new Map<string, { month: string; revenue: number; orders: number }>();
  for (const order of list) {
    const key = new Date(order.created_at).toISOString().slice(0, 7);
    const entry = byMonth.get(key) ?? { month: key, revenue: 0, orders: 0 };
    entry.orders += 1;
    if (order.payment_status === "completed") entry.revenue += Number(order.final_amount);
    byMonth.set(key, entry);
  }

  const planCounts = new Map<string, number>();
  for (const order of list) planCounts.set(order.plan_name, (planCounts.get(order.plan_name) ?? 0) + 1);

  return {
    totals: {
      revenue,
      orders: list.length,
      pending: list.filter((o) => o.payment_status === "pending").length,
      completed: completed.length,
      rejected: list.filter((o) => o.payment_status === "rejected").length,
      customers: (profiles ?? []).length,
    },
    monthly: Array.from(byMonth.values()),
    statusBreakdown: [
      { name: "Pending", value: list.filter((o) => o.payment_status === "pending").length },
      { name: "Completed", value: completed.length },
      { name: "Rejected", value: list.filter((o) => o.payment_status === "rejected").length },
    ],
    planPopularity: Array.from(planCounts.entries()).map(([name, value]) => ({ name, value })),
    couponUsage: (coupons ?? []).map((c) => ({ name: c.code, value: c.used_count })),
  };
}

export async function adminOrders(input: {
  data: { status: "all" | "pending" | "completed" | "rejected"; search?: string };
}): Promise<AdminOrder[]> {
  let query = supabase.from("orders").select(ADMIN_ORDER_COLUMNS).order("created_at", { ascending: false });
  if (input.data.status !== "all") query = query.eq("payment_status", input.data.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const list = (data ?? []) as unknown as AdminOrder[];
  const term = input.data.search?.trim().toLowerCase();
  if (!term) return list;
  return list.filter((o) =>
    [o.order_ref, o.customer_name, o.customer_email, o.customer_phone, o.utr ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
}

export async function adminSetOrderStatus(input: {
  data: { orderId: string; status: "completed" | "rejected" };
}) {
  const { error } = await rpc("admin_set_order_status", {
    p_order_id: input.data.orderId,
    p_status: input.data.status,
  });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function adminCoupons(): Promise<AdminCoupon[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select("id, code, plan_id, discount_type, discount_value, max_uses, used_count, expires_at, active, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminCoupon[];
}

export async function adminSaveCoupon(input: {
  data: {
    id?: string | null;
    code: string;
    planId: string;
    discountType: "percent" | "fixed";
    discountValue: number;
    maxUses?: number | null;
    expiresAt?: string | null;
    active: boolean;
  };
}) {
  const d = input.data;
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(d.code.trim())) {
    throw new Error("Use letters, numbers, dash or underscore only (2-40 characters).");
  }
  if (d.discountValue <= 0) throw new Error("Discount value must be greater than zero.");
  if (d.discountType === "percent" && d.discountValue > 100) {
    throw new Error("Percentage discount cannot be more than 100.");
  }

  const payload = {
    code: d.code.trim().toUpperCase(),
    plan_id: d.planId,
    discount_type: d.discountType,
    discount_value: d.discountValue,
    max_uses: d.maxUses ?? null,
    expires_at: d.expiresAt ? new Date(d.expiresAt).toISOString() : null,
    active: d.active,
  };

  const { error } = d.id
    ? await supabase.from("coupons").update(payload).eq("id", d.id)
    : await supabase.from("coupons").insert(payload);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function adminDeleteCoupon(input: { data: { id: string } }) {
  const { error } = await supabase.from("coupons").delete().eq("id", input.data.id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function adminPlans(): Promise<AdminPlan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, price, duration_days, duration_label, description, features, active, recommended, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminPlan[];
}

/** Price-only update for a plan — everything else about the plan stays untouched. */
export async function adminUpdatePlanPrice(input: { data: { id: string; price: number } }) {
  const price = Number(input.data.price);
  if (!Number.isFinite(price) || price <= 0) throw new Error("Enter a price greater than zero.");
  if (price > 1_000_000) throw new Error("That price looks too high.");

  const { error } = await supabase
    .from("plans")
    .update({ price: Math.round(price * 100) / 100 })
    .eq("id", input.data.id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}


export async function adminClearData(input: {
  data: { scope: "pending" | "completed" | "rejected" | "coupons" | "customers" | "all"; confirmText: "DELETE" };
}) {
  const { data, error } = await rpc("admin_clear_data", {
    p_scope: input.data.scope,
    p_confirm: input.data.confirmText,
  });
  if (error) throw new Error(error.message);
  return (data ?? { ok: true }) as { ok: true; cleared: string };
}

/** Short-lived signed URL so an admin can view a customer's uploaded proof. */
export async function adminProofUrl(input: { data: { orderId: string } }) {
  const { data: order, error } = await supabase
    .from("orders")
    .select("proof_path")
    .eq("id", input.data.orderId)
    .maybeSingle();
  if (error) return { ok: false as const, message: error.message };
  if (!order?.proof_path) return { ok: false as const, message: "No payment proof uploaded for this order." };

  const { data: signed, error: signError } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(order.proof_path, 300);
  if (signError || !signed) return { ok: false as const, message: signError?.message ?? "Could not open the proof." };
  return { ok: true as const, url: signed.signedUrl };
}
