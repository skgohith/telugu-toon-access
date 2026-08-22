import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { CartoonBackdrop } from "@/components/site/CartoonBackdrop";
import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { myProfile } from "@/lib/store.functions";

export function SiteLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["me", user?.id],
    queryFn: () => myProfile(),
    enabled: Boolean(user),
  });

  return (
    <div className="relative flex min-h-screen flex-col">
      <CartoonBackdrop />
      <Navbar isAdmin={Boolean(data?.isAdmin)} />
      <main className="relative flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <span className="inline-flex rounded-full border border-highlight/40 bg-highlight/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-highlight">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
