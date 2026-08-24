import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Loader2, PartyPopper, RefreshCw, Search, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateTime, inr } from "@/lib/format";
import { UTR_HINT, UTR_LENGTH, normalizeUtr, validateUtr } from "@/lib/utr";
import { getTelegramAccess, submitUtr, trackOrder } from "@/lib/store.api";



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
  const [attemptedUtrs, setAttemptedUtrs] = useState<string[]>([]);
  const [link, setLink] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [waitOpen, setWaitOpen] = useState(false);
  const [thanksOpen, setThanksOpen] = useState(false);
  const previousStatus = useRef<string | null>(null);
  const waitDismissed = useRef(false);


  const enabled = Boolean(ref && email);
  const queryKey = ["track-order", ref, email];

  const { data: order, isFetching } = useQuery({
    queryKey,
    queryFn: () => trackOrder({ data: { orderRef: ref!, email: email! } }),
    enabled,
    refetchInterval: 8000,
  });

  /** Waiting popup while the admin reviews, celebration popup the moment it is approved. */
  useEffect(() => {
    if (!order) return;
    const previous = previousStatus.current;
    previousStatus.current = order.payment_status;

    if (order.payment_status === "pending" && order.utr) {
      if (!waitDismissed.current) setWaitOpen(true);
      return;
    }

    setWaitOpen(false);
    if (order.payment_status === "completed" && previous !== "completed") setThanksOpen(true);
  }, [order]);

  /** Nudge if they try to close the tab while verification is still running. */
  useEffect(() => {
    if (!waitOpen) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [waitOpen]);


  const utrMutation = useMutation({
    mutationFn: () => submitUtr({ data: { orderRef: ref!, email: email!, utr, proofPath: null } }),
    onSuccess: () => {
      toast.success("Reference submitted! The admin will verify shortly.");
      setJustSubmitted(true);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not submit reference");
    },
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

  const utrLocked = utrMutation.isPending || justSubmitted;
  const utrCheck = validateUtr(utr);


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
            </dl>

            <Timeline order={order} />

            {order.payment_status === "pending" && (
              <div className="mt-8 space-y-5 rounded-3xl bg-highlight/10 p-6">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 size-5 shrink-0 text-highlight" />
                  <div>
                    <h3 className="font-display text-lg font-bold text-highlight">
                      {order.utr ? "Payment pending verification" : "Waiting for your payment reference"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.utr
                        ? `We received UTR ${order.utr} for ${inr(order.final_amount)}. The admin now checks it against the UPI account.`
                        : "Enter the UTR / transaction reference from your UPI app so the admin can verify your payment."}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-card/70 p-5">
                  <p className="text-sm font-bold">What happens next</p>
                  <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>1. The admin matches your UTR with the received UPI payment (usually within a few hours).</li>
                    <li>2. This page updates on its own — keep your reference {order.order_ref} safe and revisit anytime.</li>
                    <li>3. Once approved, a “Join Telegram channel” button appears here with your private invite.</li>
                    <li>4. If something looks wrong, contact support with your order reference.</li>
                  </ol>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button asChild variant="glass" size="sm">
                      <Link to="/support">Contact support</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="glass"
                      size="sm"
                      onClick={() => queryClient.invalidateQueries({ queryKey })}
                      disabled={isFetching}
                    >
                      {isFetching ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh status
                    </Button>
                  </div>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (utrLocked) return;
                    if (!utrCheck.ok) {
                      toast.error(utrCheck.message);
                      return;
                    }
                    if (utrCheck.utr === (order.utr ?? "").toUpperCase()) {
                      toast.error("This UTR is already submitted for this order and is awaiting admin review.");
                      return;
                    }
                    if (attemptedUtrs.includes(utrCheck.utr)) {
                      toast.error("You already submitted this UTR — no need to send it again.");
                      return;
                    }
                    setAttemptedUtrs((prev) => [...prev, utrCheck.utr]);
                    utrMutation.mutate();
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="utr">{order.utr ? "Correct your UTR (optional)" : "UTR / transaction reference"}</Label>
                    <Input
                      id="utr"
                      value={utr}
                      inputMode="numeric"
                      maxLength={UTR_LENGTH}
                      placeholder="402312345678"

                      aria-invalid={utr.length > 0 && !utrCheck.ok}
                      aria-describedby="status-utr-help"
                      onChange={(e) => setUtr(normalizeUtr(e.target.value))}
                      disabled={utrLocked}
                    />
                    <p
                      id="status-utr-help"
                      className={`text-xs ${utr.length > 0 && !utrCheck.ok ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {utr.length > 0 && !utrCheck.ok
                        ? utrCheck.message
                        : `${UTR_HINT}. You can update it until the admin reviews your order.`}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="gold"
                    className="w-full sm:w-auto"
                    disabled={utrLocked || !utrCheck.ok}
                  >
                    {utrMutation.isPending ? <Loader2 className="animate-spin" /> : <Send />}{" "}
                    {justSubmitted ? "Submitted — awaiting admin review" : "Submit reference"}
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

      <Dialog
        open={waitOpen}
        onOpenChange={(open) => {
          if (!open) {
            waitDismissed.current = true;
            setWaitOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-highlight">
              <Loader2 className="size-5 animate-spin" /> Please don’t leave this page
            </DialogTitle>
            <DialogDescription>
              Your payment reference {order?.utr ? `(${order.utr})` : ""} has been sent to the admin. Do not refresh or
              close this page — we’re waiting for the confirmation and this page updates automatically.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Order {order?.order_ref}. Verification is usually done within a few hours — you can safely return later with
            your reference if it takes longer.
          </p>
          <Button
            type="button"
            variant="glass"
            onClick={() => queryClient.invalidateQueries({ queryKey })}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="animate-spin" /> : <RefreshCw />} Check now
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={thanksOpen} onOpenChange={setThanksOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-success">
              <PartyPopper className="size-5" /> Thanks for purchasing!
            </DialogTitle>
            <DialogDescription>
              Your payment is verified{order ? ` for ${order.plan_name}` : ""}. Your private Telegram invite is ready —
              welcome to Telugu-Toon-World.
            </DialogDescription>
          </DialogHeader>
          <Button variant="hero" onClick={() => linkMutation.mutate()} disabled={linkMutation.isPending}>
            {linkMutation.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Join Telegram channel
          </Button>
        </DialogContent>
      </Dialog>
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

type TimelineOrder = {
  payment_status: "pending" | "completed" | "rejected";
  utr: string | null;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
};

function Timeline({ order }: { order: TimelineOrder }) {
  const utrDone = Boolean(order.utr);
  const approved = order.payment_status === "completed";
  const rejected = order.payment_status === "rejected";

  const steps = [
    {
      label: "Pending UPI payment",
      hint: `Order created ${dateTime(order.created_at)}`,
      state: "done" as const,
    },
    {
      label: "UTR submitted",
      hint: utrDone ? `Reference ${order.utr}` : "Waiting for your payment reference",
      state: utrDone ? ("done" as const) : ("current" as const),
    },
    {
      label: rejected ? "Rejected by admin" : "Approved by admin",
      hint: approved
        ? `Verified ${order.approved_at ? dateTime(order.approved_at) : ""}`
        : rejected
          ? `Rejected ${order.rejected_at ? dateTime(order.rejected_at) : ""}`
          : utrDone
            ? "Admin is verifying your payment"
            : "Starts once your reference is submitted",
      state: approved ? ("done" as const) : rejected ? ("failed" as const) : utrDone ? ("current" as const) : ("todo" as const),
    },
  ];

  return (
    <div className="mt-8 rounded-3xl bg-muted/40 p-6">
      <h3 className="font-display text-lg font-bold">Payment status</h3>
      <ol className="mt-5 space-y-5">
        {steps.map((step, index) => (
          <li key={step.label} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={`flex size-8 items-center justify-center rounded-full ${
                  step.state === "done"
                    ? "bg-success/20 text-success"
                    : step.state === "failed"
                      ? "bg-destructive/20 text-destructive"
                      : step.state === "current"
                        ? "bg-highlight/20 text-highlight"
                        : "bg-card text-muted-foreground"
                }`}
              >
                {step.state === "done" ? (
                  <CheckCircle2 className="size-4" />
                ) : step.state === "failed" ? (
                  <XCircle className="size-4" />
                ) : (
                  <Clock className="size-4" />
                )}
              </span>
              {index < steps.length - 1 && <span className="mt-1 h-8 w-px bg-border/70" />}
            </div>
            <div className="pt-1">
              <p
                className={`text-sm font-bold ${
                  step.state === "todo" ? "text-muted-foreground" : step.state === "failed" ? "text-destructive" : ""
                }`}
              >
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground">{step.hint}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
