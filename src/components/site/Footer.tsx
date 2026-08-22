import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/site/Logo";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border/60 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo />
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-highlight">Navigation</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="transition-colors hover:text-foreground">
                Home
              </Link>
            </li>
            <li>
              <Link to="/plans" className="transition-colors hover:text-foreground">
                Plans
              </Link>
            </li>
            <li>
              <Link to="/about" className="transition-colors hover:text-foreground">
                About
              </Link>
            </li>
            <li>
              <Link to="/payment-status" className="transition-colors hover:text-foreground">
                Track Order
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-highlight">Support</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/support" search={{ topic: "contact" }} className="transition-colors hover:text-foreground">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/support" search={{ topic: "payment" }} className="transition-colors hover:text-foreground">
                Payment Help
              </Link>
            </li>
            <li>
              <Link to="/support" search={{ topic: "faq" }} className="transition-colors hover:text-foreground">
                FAQ
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-highlight">Legal</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/legal" search={{ doc: "terms" }} className="transition-colors hover:text-foreground">
                Terms
              </Link>
            </li>
            <li>
              <Link to="/legal" search={{ doc: "privacy" }} className="transition-colors hover:text-foreground">
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/legal" search={{ doc: "refund" }} className="transition-colors hover:text-foreground">
                Refund Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60 px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        © 2026 Telugu-Toon-World. All rights reserved.
      </div>
    </footer>
  );
}
