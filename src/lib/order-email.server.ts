/**
 * Server-only helpers for the Telegram invite email.
 *
 * All database access goes through SECURITY DEFINER database functions using the
 * publishable key, so this works on any host without a service-role key.
 */
import * as React from "react";
import { render } from "@react-email/render";
import { createClient } from "@supabase/supabase-js";
import { TEMPLATES } from "./email-templates/registry";
import { sendTemplateEmail } from "./email-templates/send-email";

export type InviteEmailData = {
  name: string;
  planName: string;
  orderRef: string;
  amount: string;
  telegramLink?: string | undefined;
};

export type InviteEmailOutcome =
  | { status: "sent" }
  | { status: "suppressed" }
  | { status: "failed"; message: string }
  | { status: "skipped"; message: string };

function guestClient() {
  const url = process.env["SUPABASE_URL"] ?? import.meta.env['VITE_SUPABASE_URL'];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
  return createClient(url as string, key as string, { auth: { persistSession: false } });
}

type Json = Record<string, unknown>;

/** Loads the invite-email context for an approved order (order ref + email verified). */
export async function loadEmailContext(orderRef: string, email: string): Promise<Json> {
  const client = guestClient();
  const { data, error } = await (client.rpc as never as (
    fn: string,
    args: Json,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)("guest_email_context", {
    p_order_ref: orderRef,
    p_email: email,
  });
  if (error) throw new Error(error.message);
  return (data ?? { ok: false, message: "Order not found." }) as Json;
}

async function recordResult(orderId: string, status: string, message?: string) {
  const client = guestClient();
  await (client.rpc as never as (fn: string, args: Json) => Promise<unknown>)("record_access_email_result", {
    p_order_id: orderId,
    p_status: status,
    p_error: message ?? null,
  });
}

export function toEmailData(ctx: Json): InviteEmailData {
  return {
    name: String(ctx["customer_name"] ?? ""),
    planName: String(ctx["plan_name"] ?? ""),
    orderRef: String(ctx["order_ref"] ?? ""),
    amount: `₹${Number(ctx["final_amount"] ?? 0).toFixed(0)}`,
    telegramLink: (ctx["telegram_link"] as string | null) ?? undefined,
  };
}

/** Renders the invite email to HTML for the admin preview. */
export async function renderInvitePreview(data: InviteEmailData): Promise<{ subject: string; html: string }> {
  const template = TEMPLATES["telegram-access"]!;
  const html = await render(React.createElement(template.component, data as never));
  const subject = typeof template.subject === "function" ? template.subject(data as never) : template.subject;
  return { subject, html };
}

/**
 * Sends (or resends) the invite email for an approved order and records the
 * outcome on the order so both the customer and the admin can see it.
 */
export async function sendInviteEmail(
  ctx: Json,
  opts: { force?: boolean } = {},
): Promise<InviteEmailOutcome> {
  if (!ctx["ok"]) return { status: "skipped", message: String(ctx["message"] ?? "Order not available.") };

  const orderId = String(ctx["order_id"]);
  const email = String(ctx["customer_email"] ?? "");
  if (!email) return { status: "skipped", message: "This order has no email address." };

  const attempts = Number(ctx["access_email_attempts"] ?? 0);
  const data = toEmailData(ctx);

  await recordResult(orderId, "sending");
  try {
    const result = await sendTemplateEmail("telegram-access", email, {
      templateData: data,
      // A forced resend gets a fresh key so Lovable does not dedupe it away.
      idempotencyKey: opts.force
        ? `telegram-access-${orderId}-retry-${attempts + 1}`
        : `telegram-access-${orderId}`,
    });
    if (!result.sent) {
      await recordResult(orderId, "suppressed");
      return { status: "suppressed" };
    }
    await recordResult(orderId, "sent");
    return { status: "sent" };
  } catch (error) {
    const message = friendlyEmailError(error);
    await recordResult(orderId, "failed", message);
    return { status: "failed", message };
  }
}

type AnyClient = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, v: unknown) => { maybeSingle: () => Promise<{ data: Json | null; error: { message: string } | null }> };
    };
  };
};

/** Loads the invite-email context by order id, using the caller's admin session. */
export async function loadEmailContextById(client: AnyClient, orderId: string): Promise<Json> {
  const { data: order, error } = await client
    .from("orders")
    .select(
      "id, order_ref, customer_name, customer_email, plan_name, plan_id, final_amount, payment_status, access_email_status, access_email_attempts",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return { ok: false, message: "Order not found." };
  if (order["payment_status"] !== "completed") return { ok: false, message: "Order is not approved yet." };

  const { data: plan } = await client.from("plans").select("telegram_link").eq("id", order["plan_id"]).maybeSingle();

  return {
    ok: true,
    order_id: order["id"],
    order_ref: order["order_ref"],
    customer_name: order["customer_name"],
    customer_email: order["customer_email"],
    plan_name: order["plan_name"],
    final_amount: order["final_amount"],
    telegram_link: plan?.["telegram_link"] ?? null,
    access_email_status: order["access_email_status"],
    access_email_attempts: order["access_email_attempts"],
  };
}
