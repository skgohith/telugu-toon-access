import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Film, Lock, Smartphone, Sparkles, Zap } from "lucide-react";

import heroArt from "@/assets/hero.jpg";
import { SectionHeading, SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import { inr } from "@/lib/format";
import { listPlans } from "@/lib/store.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Telugu-Toon-World — Premium Telugu Cartoon Telegram Access" },
      {
        name: "description",
        content:
          "Unlock premium access to the Telugu-Toon-World private Telegram cartoon community. Two simple plans, UPI payment, instant access after verification.",
      },
      { property: "og:title", content: "Telugu-Toon-World — Your World of Telugu Cartoons" },
      {
        property: "og:description",
        content: "Get premium access to our private Telegram channel and enjoy our exclusive cartoon collection.",
      },
    ],
  }),
  component: Home,
});

const FEATURES = [
  {
    icon: Film,
    title: "Premium Cartoon Collection",
    body: "Access our curated cartoon collection through the private Telegram channel.",
  },
  { icon: Smartphone, title: "Mobile Friendly", body: "Enjoy access from your phone, tablet, or desktop." },
  { icon: Zap, title: "Simple Access", body: "Purchase your plan and receive Telegram access after payment verification." },
  { icon: Lock, title: "Private Community", body: "Access is provided only to approved customers." },
];

function Home() {
  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: () => listPlans() });

  return (
    <SiteLayout>
      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:pt-20">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-highlight">
            <Sparkles className="size-3.5" /> Private Telegram Membership
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
            Welcome to <span className="text-gradient">Telugu-Toon-World</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Unlock premium access to our private Telegram cartoon world. Get premium access to our private Telegram
            channel and enjoy our exclusive cartoon collection.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg">
              <Link to="/plans">
                <Sparkles /> Get Premium Access
              </Link>
            </Button>
            <Button asChild variant="glass" size="lg">
              <Link to="/plans">View Plans</Link>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
            {(plans ?? []).map((plan) => (
              <div key={plan.id} className="glass rounded-2xl px-5 py-3">
                <p className="font-display text-xs uppercase tracking-widest text-highlight">{plan.name}</p>
                <p className="mt-1 text-xl font-extrabold text-foreground">{inr(plan.price)}</p>
                <p className="text-xs">{plan.duration_label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative"
        >
          <div className="glass overflow-hidden rounded-4xl p-2">
            <img
              src={heroArt}
              alt="Original Telugu-Toon-World cartoon characters flying through a colourful galaxy"
              width={1536}
              height={1024}
              className="w-full rounded-3xl object-cover"
            />
          </div>
          <div className="glass absolute -bottom-6 left-6 hidden animate-float-slow rounded-2xl px-5 py-3 sm:block">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Access via</p>
            <p className="font-display text-lg font-bold text-gradient-gold">Private Telegram</p>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="Inside the channel"
          title="Explore Our Cartoon World"
          subtitle="A look at the type of cartoon content waiting inside the private community."
        />

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((category, index) => (
            <motion.article
              key={category.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: (index % 5) * 0.05 }}
              className={`group glass relative overflow-hidden rounded-3xl bg-gradient-to-br ${category.tint} to-transparent p-5 transition-transform duration-300 hover:-translate-y-1.5`}
            >
              <span className="text-2xl transition-transform duration-300 group-hover:scale-125">{category.icon}</span>
              <h3 className="mt-3 font-display text-base font-bold">{category.name}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{category.description}</p>
              <span className="pointer-events-none absolute -right-8 -top-8 size-20 rounded-full bg-highlight/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
            </motion.article>
          ))}
        </div>

        <p className="mt-10 text-center text-sm font-semibold text-highlight">
          All content is available through our private Telegram community.
        </p>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading eyebrow="Why us" title="Why Telugu-Toon-World" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="glass rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1">
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-gradient text-primary-foreground">
                <feature.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6">
        <div className="glass relative overflow-hidden rounded-4xl p-10 text-center">
          <div className="pointer-events-none absolute inset-0 bg-brand-gradient opacity-15" />
          <h2 className="relative text-3xl font-extrabold sm:text-4xl">Enter the World of Telugu-Toon-World</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">
            Choose a plan, pay with UPI, submit your reference number, and your Telegram access unlocks right after admin
            verification.
          </p>
          <Button asChild variant="gold" size="lg" className="relative mt-8">
            <Link to="/plans">Get Premium Access</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
