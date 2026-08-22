import { Logo } from "@/components/site/Logo";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border/60 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-6 px-4 py-8 sm:flex-row sm:px-6">
        <Logo />
        <p className="text-xs text-muted-foreground">© 2026 Telugu-Toon-World. All rights reserved.</p>
      </div>

      <div className="border-t border-border/60 px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        © 2026 Telugu-Toon-World. All rights reserved.
      </div>
    </footer>
  );
}
