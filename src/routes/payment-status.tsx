import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Clock, ImageUp, Loader2, Search, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
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
  const [proof, setProof] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const enabled = Boolean(ref && email);
  const queryKey = ["track-order", ref, email];

  const { data: order, isFetching } = useQuery({
    queryKey,
    queryFn: () => trackOrder({ data: { orderRef: ref!, email: email! } }),
    enabled,
    refetchInterval: 20000,
  });

  const utrMutation = useMutation({
    mutationFn: async () => {
      let proofPath: string | null = null;
      if (proof) {
        setUploading(true);
        const ext = (proof.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${ref!.toUpperCase()}/${Date.now()}.${ext || "jpg"}`;
        const { error } = await supabase.storage.from("payment-proofs").upload(path, proof, {
          contentType: proof.type || "image/jpeg",
          upsert: false,
        });
        setUploading(false);
        if (error) throw new Error(`Could not upload the screenshot: ${error.message}`);
        proofPath = path;
      }
      return submitUtr({ data: { orderRef: ref!, email: email!, utr, proofPath } });
    },
    onSuccess: () => {
      toast.success("Reference submitted! The admin will verify shortly.");
      setJustSubmitted(true);
      setProof(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      setUploading(false);
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

  const utrLocked = utrMutation.isPending || uploading || justSubmitted;

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

            <Timeline order={order} />

            {order.payment_status === "pending" && (
              <div className="mt-8 rounded-3xl bg-highlight/10 p-6">
                <h3 className="font-display text-lg font-bold text-highlight">Submit your payment reference</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter the UTR / transaction reference from your UPI app and optionally attach a screenshot of the
                  payment. You can update it until the admin reviews your order.
                </p>
                <form
                  className="mt-5 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (utrLocked) return;
                    if (utr.trim().length < 6) {
                      toast.error("UTR must be at least 6 characters");
                      return;
                    }
                    utrMutation.mutate();
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="utr">UTR / transaction reference</Label>
                    <Input
                      id="utr"
                      value={utr}
                      maxLength={40}
                      placeholder="e.g. 402312345678"
                      onChange={(e) => setUtr(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proof">Payment screenshot (optional)</Label>
                    <Input
                      id="proof"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:font-semibold"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (file && file.size > 5 * 1024 * 1024) {
                          toast.error("Screenshot must be smaller than 5 MB");
                          e.target.value = "";
                          return;
                        }
                        setProof(file);
                      }}
                    />
                    {proof && (
                      <p className="flex items-center gap-2 text-xs text-success">
                        <ImageUp className="size-3.5" /> {proof.name} ready to upload
                      </p>
                    )}
                    {order.proof_path && !proof && (
                      <p className="text-xs text-muted-foreground">A screenshot is already attached to this order.</p>
                    )}
                  </div>

                  <Button type="submit" variant="gold" className="w-full sm:w-auto" disabled={utrLocked}>
                    {utrMutation.isPending ? <Loader2 className="animate-spin" /> : <Send />}{" "}
                    {uploading
                      ? "Uploading screenshot…"
                      : justSubmitted
                        ? "Submitted — awaiting admin review"
                        : "Submit reference"}
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
