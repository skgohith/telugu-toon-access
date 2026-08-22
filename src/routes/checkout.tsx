import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, ShieldCheck, Smartphone, TicketPercent } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { z } from "zod";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr } from "@/lib/format";
import { createOrder, getPaymentDetails, listPlans, validateCoupon } from "@/lib/store.functions";

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

const formSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email").max(160),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,15}$/, "Enter a valid mobile number"),
});

type CouponState = {
  code: string;
  discountAmount: number;
  finalAmount: number;
};

function CheckoutPage() {
  const { planId } = Route.useSearch();
  const navigate = useNavigate();

  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: () => listPlans() });
  const { data: payment } = useQuery({ queryKey: ["payment-details"], queryFn: () => getPaymentDetails() });

  const plan = useMemo(() => (plans ?? []).find((p) => p.id === planId) ?? null, [plans, planId]);

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponState | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const amountDue = coupon ? coupon.finalAmount : Number(plan?.price ?? 0);
  const upiId = payment?.upiId ?? "9848779490@fam";

  useEffect(() => {
    if (!plan) return;
    const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      "Telugu-Toon-World",
    )}&am=${amountDue}&cu=INR&tn=${encodeURIComponent(`${plan.name} access`)}`;
    QRCode.toDataURL(link, { width: 320, margin: 1, color: { dark: "#0f1224", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [plan, upiId, amountDue]);

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

  const orderMutation = useMutation({
    mutationFn: (_opts: { appScheme?: string }) =>
      createOrder({
        data: {
          planId: plan!.id,
          couponCode: coupon?.code ?? null,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
      }),
    onSuccess: (order, variables) => {
      const target = { to: "/payment-status" as const, search: { ref: order.order_ref, email: order.customer_email } };
      if (variables.appScheme) {
        const link = buildUpiLink(variables.appScheme, order.order_ref);
        toast.success("Opening your UPI app — come back and enter the UTR after paying.");
        window.location.href = link;
        window.setTimeout(() => navigate(target), 1200);
        return;
      }
      toast.success("Order created. Submit your payment reference next.");
      navigate(target);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create order"),
  });

  function buildUpiLink(scheme: string, note: string) {
    const params = new URLSearchParams({
      pa: upiId,
      pn: "Telugu-Toon-World",
      am: String(amountDue),
      cu: "INR",
      tn: `${plan!.name} ${note}`,
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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validDetails()) return;
    orderMutation.mutate({});
  }

  function payWithApp(scheme: string) {
    if (!validDetails()) return;
    orderMutation.mutate({ appScheme: scheme });
  }


  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          Complete your <span className="text-gradient">purchase</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Step 1 — pay via UPI. Step 2 — create your order and submit the payment reference (UTR).
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={submit} className="glass rounded-4xl p-7">
            <h2 className="font-display text-xl font-bold">Your details</h2>
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

              <div className="space-y-2">
                <Label htmlFor="coupon">Coupon code (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    value={couponCode}
                    maxLength={40}
                    placeholder="TOON50"
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCoupon(null);
                    }}
                  />
                  <Button
                    type="button"
                    variant="glass"
                    onClick={() => couponCode.trim().length >= 2 && couponMutation.mutate()}
                    disabled={couponMutation.isPending}
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

            <Button type="submit" variant="hero" size="lg" className="mt-7 w-full" disabled={orderMutation.isPending}>
              {orderMutation.isPending ? <Loader2 className="animate-spin" /> : <ShieldCheck />} I have paid — continue
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Your order is verified manually by the admin, usually within a few hours.
            </p>
          </form>

          <div className="space-y-6">
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

            <div className="glass rounded-4xl p-7 text-center">
              <h2 className="font-display text-xl font-bold">Pay via UPI</h2>
              <p className="mt-1 text-xs text-muted-foreground">Scan the QR or pay to the UPI ID below.</p>
              {qr ? (
                <img
                  src={qr}
                  alt={`UPI QR code to pay ${inr(amountDue)} to Telugu-Toon-World`}
                  className="mx-auto mt-5 size-52 rounded-3xl bg-card p-3"
                />
              ) : (
                <div className="mx-auto mt-5 flex size-52 items-center justify-center rounded-3xl bg-muted">
                  <Loader2 className="animate-spin text-highlight" />
                </div>
              )}
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
                  On mobile, tap an app to open it with the amount pre-filled. You will come back here to enter the UTR.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {UPI_APPS.map((app) => (
                    <Button
                      key={app.label}
                      type="button"
                      variant="glass"
                      className="justify-start"
                      disabled={orderMutation.isPending}
                      onClick={() => payWithApp(app.scheme)}
                    >
                      <Smartphone /> {app.label}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                After paying, submit your 12-digit UTR / reference number — the admin then approves or rejects it.
              </p>

            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
