import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SectionHeading, SiteLayout } from "@/components/site/SiteLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const searchSchema = z.object({
  doc: z.enum(["terms", "privacy", "refund"]).optional(),
});

export const Route = createFileRoute("/legal")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Terms, Privacy & Refunds — Telugu-Toon-World" },
      {
        name: "description",
        content: "Read the Telugu-Toon-World membership terms, privacy notice and refund policy.",
      },
      { property: "og:title", content: "Legal — Telugu-Toon-World" },
      {
        property: "og:description",
        content: "Membership terms, privacy notice and refund policy.",
      },
    ],
  }),
  component: LegalPage,
});

function LegalPage() {
  const { doc } = Route.useSearch();

  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <SectionHeading eyebrow="Legal" title="Terms, Privacy & Refunds" />

        <Tabs defaultValue={doc ?? "terms"} className="mt-10">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="terms">Terms</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="refund">Refunds</TabsTrigger>
          </TabsList>

          <TabsContent
            value="terms"
            className="glass mt-6 space-y-3 rounded-4xl p-8 text-sm text-muted-foreground"
          >
            <h2 className="font-display text-lg font-bold text-foreground">Membership terms</h2>
            <p>
              A Telugu-Toon-World membership gives one person access to our private Telegram channel
              for the duration of the plan purchased. Access is personal and non-transferable.
            </p>
            <p>
              Sharing, re-uploading or reselling the invite link or channel content is not allowed
              and may result in removal without refund.
            </p>
            <p>
              Access is granted only after your UPI payment is verified by our admin using the
              reference you submit.
            </p>
            <p>
              We may update plan pricing, features or these terms; changes apply to future
              purchases.
            </p>
          </TabsContent>

          <TabsContent
            value="privacy"
            className="glass mt-6 space-y-3 rounded-4xl p-8 text-sm text-muted-foreground"
          >
            <h2 className="font-display text-lg font-bold text-foreground">Privacy notice</h2>
            <p>
              We collect only what we need to deliver your membership: your name, email address,
              mobile number, order details and the payment reference you submit.
            </p>
            <p>
              This information is used to verify your payment, provide channel access and answer
              support requests. We do not sell your data.
            </p>
            <p>
              Your account details are protected behind sign-in, and order records are visible only
              to you and our admin.
            </p>
            <p>To request deletion of your account data, contact us at hemu21203@gmail.com.</p>
          </TabsContent>

          <TabsContent
            value="refund"
            className="glass mt-6 space-y-3 rounded-4xl p-8 text-sm text-muted-foreground"
          >
            <h2 className="font-display text-lg font-bold text-foreground">Refund policy</h2>
            <p>
              Because memberships unlock private digital access immediately after verification,
              payments are generally non-refundable once access is granted.
            </p>
            <p>
              If a payment was charged but your order was rejected, or you were charged twice,
              contact us with your order reference and we will review and return the amount where
              applicable.
            </p>
            <p>Refund reviews are completed within 7 working days of your request.</p>
          </TabsContent>
        </Tabs>
      </section>
    </SiteLayout>
  );
}
