import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, LockKeyhole, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/SiteLayout";
import { StatusPill } from "@/routes/payment-status";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { dateTime, inr } from "@/lib/format";
import { getTelegramAccess, myOrders, myProfile } from "@/lib/store.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard — Telugu-Toon-World" },
      { name: "description", content: "View your Telugu-Toon-World orders, payment status and Telegram access." },
      { property: "og:title", content: "My Dashboard — Telugu-Toon-World" },
      { property: "og:description", content: "Manage your premium membership and open the private Telegram channel." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: "/dashboard" } });
  }, [loading, user, navigate]);

  const { data: me } = useQuery({ queryKey: ["me", user?.id], queryFn: () => myProfile(), enabled: Boolean(user) });
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: () => myOrders(),
    enabled: Boolean(user),
    refetchInterval: 30000,
  });

  const accessMutation = useMutation({
    mutationFn: () => getTelegramAccess(),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setLink(result.link);
      window.open(result.link, "_blank", "noopener,noreferrer");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not fetch access link"),
  });

  const hasAccess = (orders ?? []).some((o) => o.payment_status === "completed" && o.telegram_access);
  const activePlan = (orders ?? []).find((o) => o.payment_status === "completed");

  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Customer dashboard</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
              Hi, <span className="text-gradient">{me?.profile?.name || user?.email?.split("@")[0] || "Toon fan"}</span>
            </h1>
          </div>
          <Button asChild variant="glass">
            <Link to="/plans">
              <Sparkles /> Buy another plan
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="glass rounded-4xl p-7">
            <h2 className="font-display text-xl font-bold">Telegram access</h2>
            {hasAccess ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your {activePlan?.plan_name} membership is active. Tap below to open the private channel.
                </p>
                <Button
                  variant="gold"
                  size="lg"
                  className="mt-6 w-full"
                  onClick={() => accessMutation.mutate()}
                  disabled={accessMutation.isPending}
                >
                  {accessMutation.isPending ? <Loader2 className="animate-spin" /> : <Send />} Join Telegram Channel
                </Button>
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-highlight hover:underline"
                  >
                    <ExternalLink className="size-3.5" /> Open link again
                  </a>
                )}
              </>
            ) : (
              <>
                <div className="mt-6 flex flex-col items-center rounded-3xl bg-muted/40 p-7 text-center">
                  <LockKeyhole className="size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Access unlocks as soon as the admin verifies your UPI payment.
                  </p>
                </div>
                <Button asChild variant="hero" className="mt-6 w-full">
                  <Link to="/plans">Get premium access</Link>
                </Button>
              </>
            )}
          </div>

          <div className="glass rounded-4xl p-7">
            <h2 className="font-display text-xl font-bold">Your orders</h2>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-5 animate-spin text-highlight" />
              </div>
            ) : (orders ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <ul className="mt-5 space-y-3">
                {(orders ?? []).map((order) => (
                  <li key={order.id} className="rounded-3xl bg-muted/40 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-display font-bold">{order.order_ref}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.plan_name} · {inr(order.final_amount)} · {dateTime(order.created_at)}
                        </p>
                      </div>
                      <StatusPill status={order.payment_status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>UTR: {order.utr ?? "not submitted"}</span>
                      <Link
                        to="/payment-status"
                        search={{ orderId: order.id }}
                        className="font-semibold text-highlight hover:underline"
                      >
                        View details
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
