import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { dateTime, inr } from "@/lib/format";
import { myOrders, submitUtr } from "@/lib/store.functions";

const searchSchema = z.object({ orderId: z.string().optional() });

export const Route = createFileRoute("/payment-status")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Payment Status — Telugu-Toon-World" },
      { name: "description", content: "Submit your UPI payment reference and track verification of your order." },
      { property: "og:title", content: "Payment Status — Telugu-Toon-World" },
      { property: "og:description", content: "Track your Telugu-Toon-World order verification status." },
    ],
  }),
  component: PaymentStatusPage,
});

function PaymentStatusPage() {
  const { orderId } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [utr, setUtr] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: "/dashboard" } });
  }, [loading, user, navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: () => myOrders(),
    enabled: Boolean(user),
    refetchInterval: 20000,
  });

  const order = useMemo(() => {
    if (!orders?.length) return null;
    return (orderId ? orders.find((o) => o.id === orderId) : orders[0]) ?? null;
  }, [orders, orderId]);

  const utrMutation = useMutation({
    mutationFn: () => submitUtr({ data: { orderId: order!.id, utr } }),
    onSuccess: () => {
      toast.success("Reference submitted! The admin will verify shortly.");
      setUtr("");
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not submit reference"),
  });

  if (isLoading || loading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-highlight" />
        </div>
      </SiteLayout>
    );
  }

  if (!order) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="text-2xl font-extrabold">No orders yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose a premium plan to get started.</p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/plans">View plans</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const status = order.payment_status;

  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
        <div className="glass rounded-4xl p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Order reference</p>
              <h1 className="font-display text-2xl font-extrabold">{order.order_ref}</h1>
            </div>
            <StatusPill status={status} />
          </div>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <Row label="Plan" value={order.plan_name} />
            <Row label="Amount paid" value={inr(order.final_amount)} />
            <Row label="Coupon" value={order.coupon_code ?? "—"} />
            <Row label="Created" value={dateTime(order.created_at)} />
            <Row label="Reference (UTR)" value={order.utr ?? "Not submitted"} />
            <Row label="Telegram access" value={order.telegram_access ? "Unlocked" : "Locked"} />
          </dl>

          {status === "pending" && (
            <div className="mt-8 rounded-3xl bg-highlight/10 p-6">
              <h2 className="font-display text-lg font-bold text-highlight">Submit your payment reference</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the UTR / transaction reference number from your UPI app. You can update it until the admin reviews
                your order.
              </p>
              <form
                className="mt-5 flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (utr.trim().length < 6) {
                    toast.error("UTR must be at least 6 characters");
                    return;
                  }
                  utrMutation.mutate();
                }}
              >
                <div className="flex-1 space-y-2">
                  <Label htmlFor="utr" className="sr-only">
                    UTR number
                  </Label>
                  <Input
                    id="utr"
                    value={utr}
                    maxLength={40}
                    placeholder="e.g. 402312345678"
                    onChange={(e) => setUtr(e.target.value.toUpperCase())}
                  />
                </div>
                <Button type="submit" variant="gold" disabled={utrMutation.isPending}>
                  {utrMutation.isPending ? <Loader2 className="animate-spin" /> : null} Submit reference
                </Button>
              </form>
            </div>
          )}

          {status === "completed" && (
            <div className="mt-8 rounded-3xl bg-success/10 p-6 text-center">
              <h2 className="font-display text-lg font-bold text-success">Payment verified!</h2>
              <p className="mt-1 text-sm text-muted-foreground">Your Telegram access is ready in your dashboard.</p>
              <Button asChild variant="hero" className="mt-5">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          )}

          {status === "rejected" && (
            <div className="mt-8 rounded-3xl bg-destructive/10 p-6 text-center">
              <h2 className="font-display text-lg font-bold text-destructive">Payment could not be verified</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Please contact support with your order reference, or place a new order.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button asChild variant="glass">
                  <Link to="/support" search={{ topic: "payment" }}>
                    Contact support
                  </Link>
                </Button>
                <Button asChild variant="hero">
                  <Link to="/plans">Try again</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-4">
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

export function StatusPill({ status }: { status: "pending" | "completed" | "rejected" }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-success/15 px-4 py-1.5 text-sm font-bold text-success">
        <CheckCircle2 className="size-4" /> Completed
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-destructive/15 px-4 py-1.5 text-sm font-bold text-destructive">
        <XCircle className="size-4" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-highlight/15 px-4 py-1.5 text-sm font-bold text-highlight">
      <Clock className="size-4" /> Payment pending
    </span>
  );
}
