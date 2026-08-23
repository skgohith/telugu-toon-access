import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircleQuestion, Wallet } from "lucide-react";
import { z } from "zod";

import { SectionHeading, SiteLayout } from "@/components/site/SiteLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  topic: z.enum(["contact", "payment", "faq"]).optional(),
});

export const Route = createFileRoute("/support")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Support & FAQ — Telugu-Toon-World" },
      {
        name: "description",
        content: "Get help with UPI payments, order verification and Telegram access for Telugu-Toon-World.",
      },
      { property: "og:title", content: "Support & FAQ — Telugu-Toon-World" },
      { property: "og:description", content: "Answers about payments, verification time and channel access." },
      { property: "og:url", content: "https://telugu-toon-access.lovable.app/support" },
    ],
    links: [{ rel: "canonical", href: "https://telugu-toon-access.lovable.app/support" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      },
    ],
  }),
  component: SupportPage,
});

const FAQS = [
  {
    q: "How long does payment verification take?",
    a: "Our admin verifies UPI payments manually, usually within a few hours. Your track-order page updates automatically once approved.",
  },
  {
    q: "Where do I find my UTR number?",
    a: "Open your UPI app's transaction history and copy the reference / UTR number shown for the payment, then submit it on the payment status page.",
  },
  {
    q: "Can I use a coupon with any plan?",
    a: "Each coupon is tied to a specific plan. If it is not valid for the plan you selected, the checkout page will tell you.",
  },
  {
    q: "My payment was rejected. What now?",
    a: "Double-check the UTR you submitted and contact support with your order reference. You can also create a fresh order.",
  },
  {
    q: "How do I open the Telegram channel?",
    a: "After verification, open the Track Order page with your reference and email, then press Join Telegram Channel. The invite is released only to approved orders.",
  },
];

function SupportPage() {
  const { topic } = Route.useSearch();

  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="Support"
          title="We're here to help"
          subtitle="Payment help, verification updates and access questions — all in one place."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          <div className="glass rounded-3xl p-6">
            <Mail className="size-5 text-highlight" />
            <h3 className="mt-3 font-display font-bold">Email us</h3>
            <p className="mt-1 text-sm text-muted-foreground">hemu21203@gmail.com</p>
          </div>
          <div className="glass rounded-3xl p-6">
            <Wallet className="size-5 text-highlight" />
            <h3 className="mt-3 font-display font-bold">Payment help</h3>
            <p className="mt-1 text-sm text-muted-foreground">Share your order reference and UTR for a quick check.</p>
          </div>
          <div className="glass rounded-3xl p-6">
            <MessageCircleQuestion className="size-5 text-highlight" />
            <h3 className="mt-3 font-display font-bold">Access issues</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Approved but no link? Reach out and we will fix it right away.
            </p>
          </div>
        </div>

        <div className="glass mt-10 rounded-4xl p-8">
          <h2 className="font-display text-xl font-bold">Frequently asked questions</h2>
          <Accordion
            type="single"
            collapsible
            defaultValue={topic === "payment" ? "item-1" : "item-0"}
            className="mt-4"
          >
            {FAQS.map((faq, index) => (
              <AccordionItem key={faq.q} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-sm font-semibold">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mt-10 text-center">
          <Button asChild variant="hero">
            <Link to="/plans">Browse plans</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
