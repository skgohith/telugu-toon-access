import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminOrder = {
  id: string;
  order_ref: string;
  user_id: string;
  plan_name: string;
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

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  orderCount: number;
  totalSpent: number;
  currentPlan: string | null;
  telegramAccess: boolean;
};

const ADMIN_ORDER_COLUMNS =
  "id, order_ref, user_id, plan_name, coupon_code, customer_name, customer_email, customer_phone, original_amount, discount_amount, final_amount, utr, proof_path, payment_status, telegram_access, approved_at, rejected_at, created_at";

type AuthedContext = { userId: string; supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> } };

async function assertAdmin(context: AuthedContext) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Forbidden: admin access required.");
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: orders }, { data: coupons }, { data: profiles }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("order_ref, plan_name, coupon_code, final_amount, payment_status, created_at")
        .order("created_at", { ascending: true }),
      supabaseAdmin.from("coupons").select("code, used_count"),
      supabaseAdmin.from("profiles").select("id"),
    ]);

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
  });

export const adminOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        status: z.enum(["all", "pending", "completed", "rejected"]).default("all"),
        search: z.string().trim().max(80).optional(),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }): Promise<AdminOrder[]> => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin.from("orders").select(ADMIN_ORDER_COLUMNS).order("created_at", { ascending: false });
    if (data.status !== "all") query = query.eq("payment_status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const term = data.search?.toLowerCase();
    const list = (rows ?? []) as AdminOrder[];
    if (!term) return list;
    return list.filter((o) =>
      [o.order_ref, o.customer_name, o.customer_email, o.customer_phone, o.utr ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  });

export const adminSetOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(["completed", "rejected"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, coupon_id, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found.");

    const now = new Date().toISOString();
    const patch =
      data.status === "completed"
        ? {
            payment_status: "completed" as const,
            telegram_access: true,
            approved_at: now,
            rejected_at: null,
            approved_by: context.userId,
          }
        : {
            payment_status: "rejected" as const,
            telegram_access: false,
            rejected_at: now,
            approved_at: null,
            approved_by: context.userId,
          };

    const { error } = await supabaseAdmin.from("orders").update(patch).eq("id", data.orderId);
    if (error) throw new Error(error.message);

    if (data.status === "completed" && order.payment_status !== "completed" && order.coupon_id) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("used_count")
        .eq("id", order.coupon_id)
        .maybeSingle();
      if (coupon) {
        await supabaseAdmin
          .from("coupons")
          .update({ used_count: coupon.used_count + 1 })
          .eq("id", order.coupon_id);
      }
    }

    return { ok: true as const };
  });

export const adminCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminCoupon[]> => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("coupons")
      .select("id, code, plan_id, discount_type, discount_value, max_uses, used_count, expires_at, active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminCoupon[];
  });

export const adminSaveCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        id: z.string().uuid().optional().nullable(),
        code: z
          .string()
          .trim()
          .min(2)
          .max(40)
          .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, dash or underscore only"),
        planId: z.string().uuid(),
        discountType: z.enum(["percent", "fixed"]),
        discountValue: z.number().positive().max(100000),
        maxUses: z.number().int().positive().max(1000000).nullable().optional(),
        expiresAt: z.string().trim().min(1).nullable().optional(),
        active: z.boolean(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.discountType === "percent" && data.discountValue > 100) {
      throw new Error("Percentage discount cannot be more than 100.");
    }

    const payload = {
      code: data.code.trim().toUpperCase(),
      plan_id: data.planId,
      discount_type: data.discountType,
      discount_value: data.discountValue,
      max_uses: data.maxUses ?? null,
      expires_at: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      active: data.active,
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("coupons").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("coupons").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPlan[]> => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("id, name, price, duration_days, duration_label, description, features, active, recommended, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminPlan[];
  });

export const adminSavePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(2).max(60),
        price: z.number().min(0).max(1000000),
        durationDays: z.number().int().positive().max(3650),
        durationLabel: z.string().trim().max(40),
        description: z.string().trim().max(500),
        features: z.array(z.string().trim().min(1).max(160)).max(20),
        active: z.boolean(),
        recommended: z.boolean(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("plans")
      .update({
        name: data.name,
        price: data.price,
        duration_days: data.durationDays,
        duration_label: data.durationLabel,
        description: data.description,
        features: data.features,
        active: data.active,
        recommended: data.recommended,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminCustomer[]> => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: orders }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, name, email, phone, created_at").order("created_at", { ascending: false }),
      supabaseAdmin
        .from("orders")
        .select("user_id, plan_name, final_amount, payment_status, telegram_access, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const list = orders ?? [];
    return (profiles ?? []).map((p) => {
      const mine = list.filter((o) => o.user_id === p.id);
      const approved = mine.filter((o) => o.payment_status === "completed");
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        created_at: p.created_at,
        orderCount: mine.length,
        totalSpent: approved.reduce((sum, o) => sum + Number(o.final_amount), 0),
        currentPlan: approved[0]?.plan_name ?? null,
        telegramAccess: approved.some((o) => o.telegram_access),
      };
    });
  });

export const adminClearData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        scope: z.enum(["pending", "completed", "rejected", "coupons", "customers", "all"]),
        confirmText: z.literal("DELETE"),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.scope === "coupons") {
      const { error } = await supabaseAdmin.from("coupons").delete().not("id", "is", null);
      if (error) throw new Error(error.message);
      return { ok: true as const, cleared: "coupons" };
    }

    if (data.scope === "customers") {
      const { error: orderError } = await supabaseAdmin.from("orders").delete().not("id", "is", null);
      if (orderError) throw new Error(orderError.message);
      const { error } = await supabaseAdmin.from("profiles").delete().neq("id", context.userId);
      if (error) throw new Error(error.message);
      return { ok: true as const, cleared: "customers" };
    }

    if (data.scope === "all") {
      await supabaseAdmin.from("orders").delete().not("id", "is", null);
      await supabaseAdmin.from("coupons").delete().not("id", "is", null);
      await supabaseAdmin.from("profiles").delete().neq("id", context.userId);
      return { ok: true as const, cleared: "all" };
    }

    const { error } = await supabaseAdmin.from("orders").delete().eq("payment_status", data.scope);
    if (error) throw new Error(error.message);
    return { ok: true as const, cleared: data.scope };
  });

/** Signed, short-lived URL so an admin can view a customer's uploaded payment proof. */
export const adminProofUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ orderId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("proof_path")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order?.proof_path) return { ok: false as const, message: "No payment proof uploaded for this order." };

    const { data: signed, error } = await supabaseAdmin.storage
      .from("payment-proofs")
      .createSignedUrl(order.proof_path, 300);
    if (error || !signed) return { ok: false as const, message: error?.message ?? "Could not open the proof." };
    return { ok: true as const, url: signed.signedUrl };
  });
