import { Link } from "@tanstack/react-router";

import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" className={cn("group flex items-center gap-2.5", className)} aria-label="Telugu-Toon-World home">
      <span className="relative inline-flex size-10 items-center justify-center rounded-2xl bg-brand-gradient p-[2px] shadow-pop">
        <span className="flex size-full items-center justify-center rounded-[14px] bg-background/80">
          <img
            src={logo}
            alt="Telugu-Toon-World cartoon star mascot"
            width={40}
            height={40}
            className="size-8 object-contain transition-transform duration-300 group-hover:scale-110"
          />
        </span>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-extrabold tracking-tight text-gradient">Telugu-Toon-World</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Your World of Telugu Cartoons
          </span>
        </span>
      )}
    </Link>
  );
}
