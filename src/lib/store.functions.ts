import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
};

const ORDER_COLUMNS =
  "id, order_ref, plan_id, plan_name, coupon_code, customer_name, customer_email, customer_phone, original_amount, discount_amount, final_amount, utr, proof_path, payment_status, telegram_access, approved_at, rejected_at, created_at";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

const lookupSchema = z.object({
  orderRef: z.string().trim().min(4).max(40),
  email: z.string().trim().email().max(160),
});

export const listPlans = createServerFn({ method: "GET" }).handler(async (): Promise<PublicPlan[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("plans")
    .select("id, name, price, duration_days, duration_label, description, features, recommended, active, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicPlan[];
});

export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z
      .object({
        planId: z.string().uuid(),
        code: z.string().trim().min(2).max(40),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("id, price, active")
      .eq("id", data.planId)
      .maybeSingle();
    if (!plan || !plan.active) {
      return { ok: false as const, message: "This plan is not available right now." };
    }

    const { data: coupon } = await supabaseAdmin
      .from("coupons")
      .select("id, code, plan_id, discount_type, discount_value, max_uses, used_count, expires_at, active")
      .eq("code", data.code.trim().toUpperCase())
      .maybeSingle();

    if (!coupon) return { ok: false as const, message: "This coupon code does not exist." };
    if (!coupon.active) return { ok: false as const, message: "This coupon is no longer active." };
    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
      return { ok: false as const, message: "This coupon has expired." };
    }
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return { ok: false as const, message: "This coupon has reached its usage limit." };
    }
    if (coupon.plan_id !== data.planId) {
      return { ok: false as const, message: "This coupon is not valid for this plan." };
    }

    const price = Number(plan.price);
    const discount =
      coupon.discount_type === "percent"
        ? round2((price * Number(coupon.discount_value)) / 100)
        : round2(Number(coupon.discount_value));
    const finalDiscount = Math.min(discount, price);

    return {
      ok: true as const,
      message: "Coupon applied successfully!",
      code: coupon.code,
      discountType: coupon.discount_type as "percent" | "fixed",
      discountValue: Number(coupon.discount_value),
      originalAmount: price,
      discountAmount: finalDiscount,
      finalAmount: round2(price - finalDiscount),
    };
  });

/** Guest checkout — no customer account required. Amounts are computed server-side. */
export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z
      .object({
        planId: z.string().uuid(),
        couponCode: z.string().trim().max(40).optional().nullable(),
        name: z.string().trim().min(2).max(80),
        email: z.string().trim().email().max(160),
        phone: z
          .string()
          .trim()
          .regex(/^[0-9+\-\s]{8,15}$/, "Enter a valid mobile number"),
      })
      .parse(raw),
  )
  .handler(async ({ data }): Promise<OrderRow> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("id, name, price, active")
      .eq("id", data.planId)
      .maybeSingle();
    if (planError) throw new Error(planError.message);
    if (!plan || !plan.active) throw new Error("This plan is not available.");

    const original = Number(plan.price);
    let discount = 0;
    let couponId: string | null = null;
    let couponCode: string | null = null;

    if (data.couponCode) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("id, code, plan_id, discount_type, discount_value, max_uses, used_count, expires_at, active")
        .eq("code", data.couponCode.trim().toUpperCase())
        .maybeSingle();

      const usable =
        coupon &&
        coupon.active &&
        coupon.plan_id === plan.id &&
        (!coupon.expires_at || new Date(coupon.expires_at).getTime() >= Date.now()) &&
        (coupon.max_uses === null || coupon.used_count < coupon.max_uses);

      if (!usable) throw new Error("This coupon is not valid for this plan.");

      discount = Math.min(
        coupon!.discount_type === "percent"
          ? round2((original * Number(coupon!.discount_value)) / 100)
          : round2(Number(coupon!.discount_value)),
        original,
      );
      couponId = coupon!.id;
      couponCode = coupon!.code;
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: null,
        plan_id: plan.id,
        plan_name: plan.name,
        coupon_id: couponId,
        coupon_code: couponCode,
        customer_name: data.name,
        customer_email: data.email.trim().toLowerCase(),
        customer_phone: data.phone,
        original_amount: original,
        discount_amount: discount,
        final_amount: round2(original - discount),
        payment_status: "pending",
        telegram_access: false,
      })
      .select(ORDER_COLUMNS)
      .single();
    if (error) throw new Error(error.message);

    return order as OrderRow;
  });

/** Guests look up their order with the order reference + the email used at checkout. */
export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((raw) => lookupSchema.parse(raw))
  .handler(async ({ data }): Promise<OrderRow | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("order_ref", data.orderRef.trim().toUpperCase())
      .ilike("customer_email", data.email.trim())
      .maybeSingle();
    return (order as OrderRow | null) ?? null;
  });

export const submitUtr = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    lookupSchema
      .extend({
        utr: z
          .string()
          .trim()
          .min(6, "UTR must be at least 6 characters")
          .max(40)
          .regex(/^[A-Za-z0-9-]+$/, "UTR can contain only letters, numbers and dashes"),
        proofPath: z
          .string()
          .trim()
          .max(300)
          .regex(/^[A-Za-z0-9._/-]+$/, "Invalid proof reference")
          .optional()
          .nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data }): Promise<OrderRow> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ref = data.orderRef.trim().toUpperCase();
    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("id, payment_status")
      .eq("order_ref", ref)
      .ilike("customer_email", data.email.trim())
      .maybeSingle();
    if (!existing) throw new Error("Order not found. Check your reference and email.");
    if (existing.payment_status !== "pending") {
      throw new Error("This order has already been reviewed by the admin.");
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .update({
        utr: data.utr.trim().toUpperCase(),
        ...(data.proofPath ? { proof_path: data.proofPath } : {}),
      })
      .eq("id", existing.id)
      .select(ORDER_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return order as OrderRow;
  });

/**
 * The private Telegram invite link is stored per-plan and released ONLY for an
 * order the admin has approved.
 */
export const getTelegramAccess = createServerFn({ method: "POST" })
  .inputValidator((raw) => lookupSchema.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, plan_id, payment_status, telegram_access")
      .eq("order_ref", data.orderRef.trim().toUpperCase())
      .ilike("customer_email", data.email.trim())
      .maybeSingle();

    if (!order || order.payment_status !== "completed" || !order.telegram_access) {
      return { ok: false as const, message: "Telegram access unlocks after your payment is verified." };
    }

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("telegram_link")
      .eq("id", order.plan_id)
      .maybeSingle();

    if (!plan?.telegram_link) {
      return { ok: false as const, message: "Telegram link is not configured yet. Please contact support." };
    }
    return { ok: true as const, link: plan.telegram_link };
  });

/** Admin-only identity check used by the admin panel and navbar. */
export const myProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, name, email, phone, created_at").eq("id", context.userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    return {
      profile: profile ?? null,
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    };
  });

export const getPaymentDetails = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", "upi_id").maybeSingle();
  return { upiId: data?.value ?? "9848779490@fam" };
});
