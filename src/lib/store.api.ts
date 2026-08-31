/**
 * Storefront data access.
 *
 * All calls go straight to the backend Data API from the browser using the
 * publishable key, so the store works on ANY host (Lovable, Vercel, custom)
 * without server-side environment variables. Every write is wrapped in a
 * database function that validates input and recomputes amounts server-side.
 */
import { supabase } from "@/integrations/supabase/client";

export type PublicPlan = {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  duration_label: string;
  description: string;
  features: string[];
  recommended: boolean;
  active: boolean;
  sort_order: number;
};

export type OrderRow = {
  id: string;
  order_ref: string;
  plan_name: string;
  plan_id: string;
  coupon_code: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
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

export type CouponResult =
  | { ok: false; message: string }
  | {
      ok: true;
      message: string;
      code: string;
      discountType: "percent" | "fixed";
      discountValue: number;
      originalAmount: number;
      discountAmount: number;
      finalAmount: number;
    };

type Rpc = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

function unwrap<T>(data: unknown, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export async function listPlans(): Promise<PublicPlan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select(
      "id, name, price, duration_days, duration_label, description, features, recommended, active, sort_order",
    )
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PublicPlan[];
}

export async function getPaymentDetails(): Promise<{
  upiId: string;
  payeeName: string;
  qrUrl: string;
}> {
  const fallback = { upiId: "9848779490@fam", payeeName: "BOLLOJI HEMANTH", qrUrl: "" };
  const { data, error } = await rpc("get_payment_settings");
  if (error || !data) return fallback;
  const d = data as Partial<typeof fallback>;
  return {
    upiId: d.upiId || fallback.upiId,
    payeeName: d.payeeName || fallback.payeeName,
    qrUrl: d.qrUrl || "",
  };
}

export async function validateCoupon(input: {
  data: { planId: string; code: string };
}): Promise<CouponResult> {
  const { data, error } = await rpc("guest_validate_coupon", {
    p_plan_id: input.data.planId,
    p_code: input.data.code,
  });
  return unwrap<CouponResult>(data, error);
}

export async function createOrder(input: {
  data: { planId: string; couponCode?: string | null; name: string; email: string; phone: string };
}): Promise<OrderRow> {
  const { data, error } = await rpc("guest_create_order", {
    p_plan_id: input.data.planId,
    p_coupon_code: input.data.couponCode ?? null,
    p_name: input.data.name,
    p_email: input.data.email,
    p_phone: input.data.phone,
  });
  return unwrap<OrderRow>(data, error);
}

/** Creates the order with its payment reference atomically. */
export async function createPaidOrder(input: {
  data: {
    planId: string;
    couponCode?: string | null;
    name: string;
    email: string;
    phone: string;
    utr: string;
    instagram?: string | null;
    telegram?: string | null;
  };
}): Promise<OrderRow> {
  const { data, error } = await rpc("guest_create_paid_order", {
    p_plan_id: input.data.planId,
    p_coupon_code: input.data.couponCode ?? null,
    p_name: input.data.name,
    p_email: input.data.email,
    p_phone: input.data.phone,
    p_utr: input.data.utr,
    p_instagram: input.data.instagram ?? null,
    p_telegram: input.data.telegram ?? null,
  });
  return unwrap<OrderRow>(data, error);
}

export async function trackOrder(input: {
  data: { orderRef: string; email: string };
}): Promise<OrderRow | null> {
  const { data, error } = await rpc("guest_track_order", {
    p_order_ref: input.data.orderRef,
    p_email: input.data.email,
  });
  return unwrap<OrderRow | null>(data, error);
}

export async function submitUtr(input: {
  data: { orderRef: string; email: string; utr: string; proofPath?: string | null };
}): Promise<OrderRow> {
  const { data, error } = await rpc("guest_submit_utr", {
    p_order_ref: input.data.orderRef,
    p_email: input.data.email,
    p_utr: input.data.utr,
    p_proof_path: input.data.proofPath ?? null,
  });
  return unwrap<OrderRow>(data, error);
}

export async function getTelegramAccess(input: {
  data: { orderRef: string; email: string };
}): Promise<{ ok: false; message: string } | { ok: true; link: string; planName: string }> {
  const { data, error } = await rpc("guest_telegram_access", {
    p_order_ref: input.data.orderRef,
    p_email: input.data.email,
  });
  return unwrap(data, error);
}

/** Signed-in admin identity + role, resolved through the browser session. */
export async function myProfile(): Promise<{
  profile: { id: string; name: string; email: string; phone: string; created_at: string } | null;
  isAdmin: boolean;
}> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { profile: null, isAdmin: false };

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, phone, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    profile: (profile ?? null) as never,
    isAdmin: (roles ?? []).some((r) => r.role === "admin"),
  };
}
