import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Emails the approved customer their Telegram invite link.
 * Admin-only: the caller's admin role is re-checked server-side.
 */
export const sendAccessEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ orderId: z.string().uuid(), force: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Not authorized.");

    const { loadEmailContextById, sendInviteEmail } = await import("./order-email.server");
    const ctx = await loadEmailContextById(context.supabase as never, data.orderId);
    return sendInviteEmail(ctx, { force: data.force ?? false });
  });

/** Admin-only: renders the invite email exactly as the customer would receive it. */
export const previewAccessEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Not authorized.");

    const { loadEmailContextById, toEmailData, renderInvitePreview } =
      await import("./order-email.server");
    const ctx = await loadEmailContextById(context.supabase as never, data.orderId);
    if (!ctx["ok"])
      return { ok: false as const, message: String(ctx["message"] ?? "Not available.") };
    const rendered = await renderInvitePreview(toEmailData(ctx));
    return { ok: true as const, to: String(ctx["customer_email"] ?? ""), ...rendered };
  });

/**
 * Customer-facing resend: verified by order reference + the email on the order,
 * and only possible once the order has been approved.
 */
export const resendAccessEmail = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ orderRef: z.string().min(3).max(64), email: z.string().email() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { loadEmailContext, sendInviteEmail } = await import("./order-email.server");
    const ctx = await loadEmailContext(data.orderRef, data.email);
    return sendInviteEmail(ctx, { force: true });
  });
