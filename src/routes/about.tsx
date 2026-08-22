import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartHandshake, Instagram, Palette, Send, ShieldCheck, Users } from "lucide-react";

import { SectionHeading, SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Telugu-Toon-World" },
      {
        name: "description",
        content: "Telugu-Toon-World is a private Telegram community bringing curated Telugu cartoon content to fans.",
      },
      { property: "og:title", content: "About Telugu-Toon-World" },
      { property: "og:description", content: "Learn about our private Telugu cartoon community and how access works." },
    ],
  }),
  component: AboutPage,
});

const VALUES = [
  { icon: Palette, title: "Curated with care", body: "Every collection is organised so you always find something to watch." },
  { icon: Users, title: "Community first", body: "A friendly private space for Telugu cartoon lovers of all ages." },
  { icon: ShieldCheck, title: "Verified access", body: "Each membership is manually verified, keeping the channel private." },
  { icon: HeartHandshake, title: "Real support", body: "We reply to payment and access questions directly." },
];

function AboutPage() {
  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="About"
          title="Our World of Telugu Cartoons"
          subtitle="Telugu-Toon-World is a premium membership that unlocks our private Telegram cartoon community."
        />

        <div className="glass mt-12 space-y-4 rounded-4xl p-8 text-sm leading-relaxed text-muted-foreground">
          <p>
            We started Telugu-Toon-World for one simple reason: fans wanted one dependable place to enjoy Telugu cartoon
            content with friends and family. Instead of scattered links, we keep everything organised inside a single
            private Telegram channel.
          </p>
          <p>
            Members choose a premium plan, pay securely through UPI, and submit their payment reference. Once our admin
            verifies the payment, the private channel invite unlocks on your track-order page — no account needed.
          </p>
          <p>
            We keep the community private on purpose — it protects the experience for paying members and lets us support
            everyone properly.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {VALUES.map((value) => (
            <div key={value.title} className="glass rounded-3xl p-6">
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-gradient text-primary-foreground">
                <value.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{value.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{value.body}</p>
            </div>
          ))}
        </div>

        <div className="glass mt-12 rounded-4xl p-8 text-center">
          <h3 className="font-display text-xl font-bold">Connect with us</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Follow our main page for updates, sneak peeks, and new cartoon drops.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="outline" size="lg" className="gap-2 rounded-full">
              <a
                href="https://www.instagram.com/telugu_toon_world?igsi=bWtjeTM3enNucGpq"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="size-5" />
                Instagram
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 rounded-full">
              <a
                href="https://t.me/%2BuVSk3XrQ74ZmZGFl?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAb21jcAT2ippwZG9mAmV4dG4DYWVtAjExAHNydGMGYXBwX2lkDzU2NzA2NzM0MzM1MjQyNwABp9Hcl_JJiXvebhcgWc-281IMe4n_lyeWEM3ggedkWfYmaW654Wzd7eNheuQT_aem_hqmmzok1Wc67hcgZhMsNDQ"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send className="size-5" />
                Telegram
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Button asChild variant="hero" size="lg">
            <Link to="/plans">Join Telugu-Toon-World</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
