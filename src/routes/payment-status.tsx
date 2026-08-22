import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Clock, Loader2, Search, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateTime, inr } from "@/lib/format";
import { getTelegramAccess, submitUtr, trackOrder } from "@/lib/store.functions";

const searchSchema = z.object({
  ref: z.string().optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/payment-status")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Track Order — Telugu-Toon-World" },
      { name: "description", content: "Submit your UPI payment reference and track verification of your order." },
      { property: "og:title", content: "Track Order — Telugu-Toon-World" },
      { property: "og:description", content: "Track your Telugu-Toon-World order verification status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentStatusPage,
});

function PaymentStatusPage() {
  const { ref, email } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [lookup, setLookup] = useState({ ref: ref ?? "", email: email ?? "" });
  const [utr, setUtr] = useState("");
  const [link, setLink] = useState<string | null>(null);

  const enabled = Boolean(ref && email);
  const queryKey = ["track-order", ref, email];

  const { data: order, isFetching } = useQuery({
    queryKey,
    queryFn: () => trackOrder({ data: { orderRef: ref!, email: email! } }),
    enabled,
    refetchInterval: 20000,
  });

  const utrMutation = useMutation({
    mutationFn: () => submitUtr({ data: { orderRef: ref!, email: email!, utr } }),
    onSuccess: () => {
      toast.success("Reference submitted! The admin will verify shortly.");
      setUtr("");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not submit reference"),
  });

  const linkMutation = useMutation({
    mutationFn: () => getTelegramAccess({ data: { orderRef: ref!, email: email! } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setLink(result.link);
      window.open(result.link, "_blank", "noopener,noreferrer");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not fetch the invite link"),
  });

  function doLookup(event: React.FormEvent) {
    event.preventDefault();
    if (lookup.ref.trim().length < 4 || !lookup.email.includes("@")) {
      toast.error("Enter your order reference and the email you used at checkout");
      return;
    }
    navigate({
      to: "/payment-status",
      search: { ref: lookup.ref.trim().toUpperCase(), email: lookup.email.trim() },
    });
  }

  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          Track your <span className="text-gradient">order</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No account needed — use your order reference (TTW-…) and the email you entered at checkout.
        </p>

        <form onSubmit={doLookup} className="glass mt-8 grid gap-4 rounded-4xl p-6 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="ref">Order reference</Label>
            <Input
              id="ref"
              value={lookup.ref}
              maxLength={40}
              placeholder="TTW-2026-000001"
              onChange={(e) => setLookup({ ...lookup, ref: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lookup-email">Email</Label>
            <Input
              id="lookup-email"
              type="email"
              value={lookup.email}
              maxLength={160}
              placeholder="you@example.com"
              onChange={(e) => setLookup({ ...lookup, email: e.target.value })}
            />
          </div>
          <Button type="submit" variant="hero" className="sm:self-end">
            <Search /> Track
          </Button>
        </form>

        {enabled && isFetching && !order && (
          <div className="mt-10 flex justify-center">
            <Loader2 className="size-6 animate-spin text-highlight" />
          </div>
        )}

        {enabled && !isFetching && !order && (
          <div className="glass mt-8 rounded-4xl p-8 text-center">
            <h2 className="font-display text-xl font-bold">Order not found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Double-check the reference and email. Still stuck? Reach us from the support page.
            </p>
            <Button asChild variant="glass" className="mt-5">
              <Link to="/support">Get support</Link>
            </Button>
          </div>
        )}

        {order && (
          <div className="glass mt-8 rounded-4xl p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Order reference</p>
                <h2 className="font-display text-2xl font-extrabold">{order.order_ref}</h2>
              </div>
              <StatusPill status={order.payment_status} />
            </div>

            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              <Row label="Plan" value={order.plan_name} />
              <Row label="Amount payable" value={inr(order.final_amount)} />
              <Row label="Coupon" value={order.coupon_code ?? "—"} />
              <Row label="Created" value={dateTime(order.created_at)} />
              <Row label="Reference (UTR)" value={order.utr ?? "Not submitted"} />
              <Row label="Telegram access" value={order.telegram_access ? "Unlocked" : "Locked"} />
            </dl>

            {order.payment_status === "pending" && (
              <div className="mt-8 rounded-3xl bg-highlight/10 p-6">
                <h3 className="font-display text-lg font-bold text-highlight">Submit your payment reference</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter the UTR / transaction reference from your UPI app. You can update it until the admin reviews your
                  order.
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
                    {utrMutation.isPending ? <Loader2 className="animate-spin" /> : <Send />} Submit reference
                  </Button>
                </form>
              </div>
            )}

            {order.payment_status === "completed" && (
              <div className="mt-8 rounded-3xl bg-success/10 p-6 text-center">
                <h3 className="font-display text-lg font-bold text-success">Payment verified!</h3>
                <p className="mt-1 text-sm text-muted-foreground">Your private Telegram invite is ready.</p>
                <Button
                  variant="hero"
                  className="mt-5"
                  onClick={() => linkMutation.mutate()}
                  disabled={linkMutation.isPending}
                >
                  {linkMutation.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Join Telegram channel
                </Button>
                {link && (
                  <p className="mt-3 break-all text-xs text-muted-foreground">
                    Invite link:{" "}
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-highlight hover:underline">
                      {link}
                    </a>
                  </p>
                )}
              </div>
            )}

            {order.payment_status === "rejected" && (
              <div className="mt-8 rounded-3xl bg-destructive/10 p-6 text-center">
                <h3 className="font-display text-lg font-bold text-destructive">Payment could not be verified</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  The admin could not match your reference. Please contact support or place a new order.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Button asChild variant="glass">
                    <Link to="/support">Contact support</Link>
                  </Button>
                  <Button asChild variant="hero">
                    <Link to="/plans">Order again</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: "pending" | "completed" | "rejected" }) {
  const map = {
    pending: { label: "Awaiting verification", className: "bg-highlight/15 text-highlight", Icon: Clock },
    completed: { label: "Verified", className: "bg-success/15 text-success", Icon: CheckCircle2 },
    rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive", Icon: XCircle },
  } as const;
  const { label, className, Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${className}`}>
      <Icon className="size-4" /> {label}
    </span>
  );
}
