import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Emails the approved customer their Telegram invite link.
 * Admin-only: the caller's admin role is re-checked server-side.
 */
export const sendAccessEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Not authorized.");

    const { data: order, error } = await context.supabase
      .from("orders")
      .select("order_ref, customer_name, customer_email, plan_name, plan_id, final_amount, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return { sent: false as const, reason: "order_not_found" };
    if (order.payment_status !== "completed") return { sent: false as const, reason: "not_approved" };
    if (!order.customer_email) return { sent: false as const, reason: "no_email" };

    const { data: plan } = await context.supabase
      .from("plans")
      .select("telegram_link")
      .eq("id", order.plan_id)
      .maybeSingle();

    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const result = await sendTemplateEmail("telegram-access", order.customer_email, {
      templateData: {
        name: order.customer_name,
        planName: order.plan_name,
        orderRef: order.order_ref,
        amount: `₹${Number(order.final_amount).toFixed(0)}`,
        telegramLink: plan?.telegram_link ?? undefined,
      },
      idempotencyKey: `telegram-access-${data.orderId}`,
    });

    return result;
  });
