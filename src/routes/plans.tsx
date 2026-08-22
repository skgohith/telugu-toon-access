import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown, Loader2, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { SectionHeading, SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";
import { listPlans } from "@/lib/store.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Premium Plans — Telugu-Toon-World" },
      {
        name: "description",
        content:
          "Choose Lite Premium or Max Premium to unlock the Telugu-Toon-World private Telegram cartoon channel. Coupon codes supported at checkout.",
      },
      { property: "og:title", content: "Premium Plans — Telugu-Toon-World" },
      { property: "og:description", content: "Two simple premium plans with UPI payment and coupon support." },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const navigate = useNavigate();
  const { data: plans, isLoading, error, refetch } = useQuery({ queryKey: ["plans"], queryFn: () => listPlans() });

  function choose(planId: string) {
    navigate({ to: "/checkout", search: { planId } });
  }

  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Choose Your Premium Plan"
          subtitle="Pay securely via UPI, submit your reference number, and get Telegram access after admin verification."
        />

        {isLoading ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="size-6 animate-spin text-highlight" />
          </div>
        ) : error || (plans ?? []).length === 0 ? (
          <div className="glass mx-auto mt-14 max-w-xl rounded-3xl p-8 text-center">
            <p className="font-display text-lg font-bold">Plans could not be loaded</p>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn&apos;t reach the plan catalogue just now. Please try again in a moment.
            </p>
            <Button variant="hero" className="mt-6" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {(plans ?? []).map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.1 }}
                className={cn(
                  "glass relative flex flex-col overflow-hidden rounded-4xl p-8",
                  plan.recommended && "ring-2 ring-highlight/60",
                )}
              >
                {plan.recommended && (
                  <span className="absolute right-6 top-6 inline-flex items-center gap-1 rounded-full bg-gold-gradient px-3 py-1 text-xs font-bold text-highlight-foreground">
                    <Crown className="size-3.5" /> Most Popular
                  </span>
                )}
                <h3 className="font-display text-2xl font-extrabold">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-5xl font-extrabold text-gradient">{inr(plan.price)}</span>
                  <span className="pb-2 text-sm text-muted-foreground">/ {"\u00a0"}{plan.duration_label}</span>
                </div>

                <ul className="mt-7 space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
                        <Check className="size-3.5" />
                      </span>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.recommended ? "gold" : "hero"}
                  size="lg"
                  className="mt-8 w-full"
                  onClick={() => choose(plan.id)}
                >
                  <Sparkles /> Choose {plan.name}
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        <div className="glass mt-12 rounded-3xl p-6 text-center text-sm text-muted-foreground">
          Have a coupon code? Apply it on the checkout page — each coupon works only with its own plan.
        </div>
      </section>
    </SiteLayout>
  );
}
