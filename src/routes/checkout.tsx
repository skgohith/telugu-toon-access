import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Copy, Loader2, ShieldCheck, Smartphone, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr } from "@/lib/format";
import { createPaidOrder, getPaymentDetails, validateCoupon } from "@/lib/store.api";

import { plansQueryOptions } from "@/lib/plans";
import { UTR_HINT, UTR_LENGTH, normalizeUtr, validateUtr } from "@/lib/utr";
import upiQr from "@/assets/upi-qr.jpg";

const searchSchema = z.object({ planId: z.string().optional() });

const UPI_APPS = [
  { label: "Google Pay", scheme: "tez://upi/pay?" },
  { label: "PhonePe", scheme: "phonepe://pay?" },
  { label: "Paytm", scheme: "paytmmp://pay?" },
  { label: "Any UPI app", scheme: "upi://pay?" },
] as const;

export const Route = createFileRoute("/checkout")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Checkout — Telugu-Toon-World" },
      { name: "description", content: "Complete your Telugu-Toon-World premium purchase with UPI payment." },
      { property: "og:title", content: "Checkout — Telugu-Toon-World" },
      { property: "og:description", content: "Pay via UPI and submit your payment reference for verification." },
    ],
  }),
  component: CheckoutPage,
});

const handleRule = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, ""))
  .refine((v) => v === "" || /^[A-Za-z0-9._]{2,40}$/.test(v), "Username can use letters, numbers, dot or underscore");

const formSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().email("Enter a valid email").max(160),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s]{8,15}$/, "Enter a valid mobile number"),
    instagram: handleRule,
    telegram: handleRule,
  })
  .refine((v) => v.instagram !== "" || v.telegram !== "", {
    message: "Add your Instagram or Telegram username (at least one)",
    path: ["instagram"],
  });

type CouponState = {
  code: string;
  discountAmount: number;
  finalAmount: number;
};

const STEPS = ["Your details", "Payment", "UTR & confirm"] as const;

function CheckoutPage() {
  const { planId } = Route.useSearch();
  const navigate = useNavigate();

  const { data: plans } = useQuery(plansQueryOptions);
  const { data: payment } = useQuery({ queryKey: ["payment-details"], queryFn: () => getPaymentDetails() });

  const plan = useMemo(() => (plans ?? []).find((p) => p.id === planId) ?? null, [plans, planId]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({ name: "", email: "", phone: "", instagram: "", telegram: "" });
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponState | null>(null);
  const [openingApp, setOpeningApp] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [utr, setUtr] = useState("");
  const [attemptedUtrs, setAttemptedUtrs] = useState<string[]>([]);
  const [stage, setStage] = useState<string | null>(null);
  const [awaitingReturn, setAwaitingReturn] = useState(false);

  /** When the customer comes back from their UPI app, move straight to the UTR step. */
  useEffect(() => {
    if (!awaitingReturn) return;
    function onBack() {
      if (document.visibilityState !== "visible") return;
      setAwaitingReturn(false);
      setStep(3);
    }
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    return () => {
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
    };
  }, [awaitingReturn]);

  const amountDue = coupon ? coupon.finalAmount : Number(plan?.price ?? 0);
  const upiId = payment?.upiId ?? "9848779490@fam";
  const payeeName = payment?.payeeName || "BOLLOJI HEMANTH";
  const qrSrc = payment?.qrUrl || upiQr;

  const couponMutation = useMutation({
    mutationFn: () => validateCoupon({ data: { planId: plan!.id, code: couponCode } }),
    onSuccess: (result) => {
      if (!result.ok) {
        setCoupon(null);
        toast.error(result.message);
        return;
      }
      setCoupon({ code: result.code, discountAmount: result.discountAmount, finalAmount: result.finalAmount });
      toast.success(result.message);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Coupon check failed"),
  });

  /**
   * Nothing is stored until the payment reference is supplied:
   * the order row is created and the UTR attached in one go.
   */
  const orderMutation = useMutation({
    mutationFn: async () => {
      setStage("Submitting your payment details…");
      return createPaidOrder({
        data: {
          planId: plan!.id,
          couponCode: coupon?.code ?? null,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          instagram: form.instagram.trim().replace(/^@/, "") || null,
          telegram: form.telegram.trim().replace(/^@/, "") || null,

          utr: utr.trim(),
        },
      });
    },
    onSuccess: (order) => {
      setSubmitted(true);
      setStage(null);
      toast.success("Payment details submitted — the admin will verify shortly.");
      navigate({ to: "/payment-status", search: { ref: order.order_ref, email: order.customer_email } });
    },
    onError: (error) => {
      setStage(null);
      setSubmitted(false);
      toast.error(error instanceof Error ? error.message : "Could not submit your payment");
    },
  });

  function buildUpiLink(scheme: string) {
    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: String(amountDue),
      cu: "INR",
      tn: `${plan!.name} access`,
    });
    return `${scheme}${params.toString()}`;
  }

  if (!plan) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="text-2xl font-extrabold">Select a plan first</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pick Lite Premium or Max Premium to continue.</p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/plans">View plans</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  function validDetails() {
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return false;
    }
    return true;
  }

  const locked = orderMutation.isPending || submitted;
  const utrCheck = validateUtr(utr);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (locked) return;
    if (!validDetails()) {
      setStep(1);
      return;
    }
    if (!utrCheck.ok) {
      toast.error(utrCheck.message);
      return;
    }
    // Guard against the same reference being submitted twice from this page.
    if (attemptedUtrs.includes(utrCheck.utr)) {
      toast.error("You already submitted this UTR. Track your order instead of sending it again.");
      return;
    }
    setAttemptedUtrs((prev) => [...prev, utrCheck.utr]);
    orderMutation.mutate();
  }

  /** Opens the chosen UPI app only — you stay in the flow until the UTR is entered. */
  function payWithApp(scheme: string, label: string) {
    if (locked) return;
    setOpeningApp(label);
    setAwaitingReturn(true);
    window.location.href = buildUpiLink(scheme);
    toast.success(`Opening ${label} — after paying, come back here and enter your UTR.`);
    window.setTimeout(() => setOpeningApp(null), 4000);
  }

  const orderSummary = (
    <div className="glass rounded-4xl p-7">
      <h2 className="font-display text-xl font-bold">Order summary</h2>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Plan</dt>
          <dd className="font-semibold">{plan.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Duration</dt>
          <dd className="font-semibold">{plan.duration_label}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Price</dt>
          <dd className="font-semibold">{inr(plan.price)}</dd>
        </div>
        {coupon && (
          <div className="flex justify-between text-success">
            <dt>Discount ({coupon.code})</dt>
            <dd className="font-semibold">-{inr(coupon.discountAmount)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border/60 pt-4 text-base">
          <dt className="font-bold">Amount to pay</dt>
          <dd className="text-2xl font-extrabold text-gradient-gold">{inr(amountDue)}</dd>
        </div>
      </dl>
    </div>
  );

  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          Complete your <span className="text-gradient">purchase</span>
        </h1>

        <ol className="mt-6 flex items-center gap-2">
          {STEPS.map((label, index) => {
            const value = index + 1;
            const active = step === value;
            const done = step > value;
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    active
                      ? "bg-highlight text-highlight-foreground"
                      : done
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {value}
                </span>
                <span
                  className={`hidden text-xs font-semibold sm:block ${active ? "" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
                {value < STEPS.length && <span className="h-px flex-1 bg-border/60" />}
              </li>
            );
          })}
        </ol>

        <div className="mt-8 space-y-6">
          {step === 1 && (
            <form
              className="glass rounded-4xl p-7"
              onSubmit={(event) => {
                event.preventDefault();
                if (!validDetails()) return;
                setStep(2);
              }}
            >
              <h2 className="font-display text-xl font-bold">Your details</h2>
              <p className="mt-1 text-xs text-muted-foreground">Step 1 of 3 — we use these to send your access.</p>
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    maxLength={80}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      maxLength={160}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile number</Label>
                    <Input
                      id="phone"
                      inputMode="tel"
                      value={form.phone}
                      maxLength={15}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="rounded-3xl bg-muted/40 p-4">
                  <p className="text-sm font-semibold">How can we reach you?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fill at least one — either your Instagram or your Telegram username (both is even better).
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram username</Label>
                      <Input
                        id="instagram"
                        value={form.instagram}
                        maxLength={40}
                        autoComplete="off"
                        onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telegram">Telegram username</Label>
                      <Input
                        id="telegram"
                        value={form.telegram}
                        maxLength={40}
                        autoComplete="off"
                        onChange={(e) => setForm({ ...form, telegram: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coupon">Coupon code (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      value={couponCode}
                      maxLength={40}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCoupon(null);
                      }}
                    />
                    <Button
                      type="button"
                      variant="glass"
                      onClick={() => couponCode.trim().length >= 2 && couponMutation.mutate()}
                      disabled={couponMutation.isPending || locked}
                    >
                      {couponMutation.isPending ? <Loader2 className="animate-spin" /> : <TicketPercent />} Apply
                    </Button>
                  </div>
                  {coupon && (
                    <p className="text-xs font-semibold text-success">
                      {coupon.code} applied — you save {inr(coupon.discountAmount)}.
                    </p>
                  )}
                </div>
              </div>

              <Button type="submit" variant="hero" size="lg" className="mt-7 w-full">
                Continue to payment <ArrowRight />
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="glass rounded-4xl p-7 text-center">
              <h2 className="font-display text-xl font-bold">Pay via UPI</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Step 2 of 3 — scan the QR, use the UPI ID, or tap a UPI app.
              </p>
              <img
                src={qrSrc}
                alt={`UPI QR code for ${payeeName} (${upiId}) — scan to pay ${inr(amountDue)}`}
                className="mx-auto mt-5 w-52 rounded-3xl bg-card p-2"
                loading="lazy"
              />
              <p className="mt-2 text-xs font-semibold">{payeeName}</p>

              <div className="mt-5 flex items-center justify-center gap-2">
                <code className="rounded-full bg-muted px-4 py-2 text-sm font-semibold">{upiId}</code>
                <Button
                  type="button"
                  variant="glass"
                  size="icon"
                  aria-label="Copy UPI ID"
                  onClick={() => {
                    navigator.clipboard.writeText(upiId);
                    toast.success("UPI ID copied");
                  }}
                >
                  <Copy />
                </Button>
              </div>

              <div className="mt-6 border-t border-border/60 pt-5 text-left">
                <p className="text-sm font-bold">Pay with a UPI app</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  On mobile, tap an app to open it with the amount pre-filled. When you come back, you land on the UTR
                  step.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {UPI_APPS.map((app) => {
                    const isOpening = openingApp === app.label;
                    return (
                      <Button
                        key={app.label}
                        type="button"
                        variant="glass"
                        className="w-full justify-start"
                        disabled={locked}
                        onClick={() => payWithApp(app.scheme, app.label)}
                      >
                        {isOpening ? <Loader2 className="animate-spin" /> : <Smartphone />} {app.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="glass" className="sm:w-auto" onClick={() => setStep(1)}>
                  <ArrowLeft /> Back
                </Button>
                <Button type="button" variant="hero" size="lg" className="flex-1" onClick={() => setStep(3)}>
                  I have completed the payment <ArrowRight />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={submit} className="glass rounded-4xl p-7">
              <h2 className="font-display text-xl font-bold">Confirm your payment</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Step 3 of 3 — your order is created only after you enter the UTR.
              </p>
              <div className="mt-5 space-y-2">
                <Label htmlFor="utr">UTR / transaction reference ({UTR_LENGTH} digits)</Label>
                <Input
                  id="utr"
                  value={utr}
                  inputMode="numeric"
                  maxLength={UTR_LENGTH}
                  autoFocus
                  aria-invalid={utr.length > 0 && !utrCheck.ok}
                  aria-describedby="utr-help"
                  onChange={(e) => setUtr(normalizeUtr(e.target.value))}
                  disabled={locked}
                />
                <p
                  id="utr-help"
                  className={`text-xs ${utr.length > 0 && !utrCheck.ok ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {utr.length > 0 && !utrCheck.ok ? utrCheck.message : `${UTR_HINT}. Each UTR can be used only once.`}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="glass"
                  className="sm:w-auto"
                  disabled={locked}
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft /> Back
                </Button>
                <Button type="submit" variant="hero" size="lg" className="flex-1" disabled={locked || !utrCheck.ok}>
                  {orderMutation.isPending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}{" "}
                  {stage ?? (submitted ? "Submitted — redirecting…" : "Submit payment details")}
                </Button>
              </div>

              <p className="mt-3 text-center text-xs text-muted-foreground">
                Your order is verified manually by the admin, usually within a few hours.
              </p>
            </form>
          )}

          {orderSummary}
        </div>
      </section>
    </SiteLayout>
  );
}
