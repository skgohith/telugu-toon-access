const STARS = [
  { top: "12%", left: "8%", size: 10, delay: "0s" },
  { top: "24%", left: "82%", size: 14, delay: "0.6s" },
  { top: "62%", left: "18%", size: 8, delay: "1.2s" },
  { top: "74%", left: "70%", size: 12, delay: "0.3s" },
  { top: "38%", left: "48%", size: 7, delay: "1.8s" },
  { top: "86%", left: "36%", size: 9, delay: "2.2s" },
];

/** Decorative cartoon sky: floating clouds, twinkling stars and drifting blobs. */
export function CartoonBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-24 top-10 size-72 rounded-full bg-primary/25 blur-3xl animate-float-slow" />
      <div className="absolute -right-16 top-40 size-80 rounded-full bg-secondary/25 blur-3xl animate-float-fast" />
      <div className="absolute bottom-0 left-1/3 size-64 rounded-full bg-highlight/15 blur-3xl animate-drift" />

      {STARS.map((star, index) => (
        <span
          key={index}
          className="absolute animate-twinkle rounded-full bg-highlight"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            animationDelay: star.delay,
            clipPath:
              "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          }}
        />
      ))}

      <div className="absolute left-[10%] top-[18%] h-6 w-16 rounded-full bg-foreground/10 animate-float-slow" />
      <div className="absolute right-[14%] top-[58%] h-5 w-14 rounded-full bg-foreground/10 animate-float-fast" />
    </div>
  );
}
