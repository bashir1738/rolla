/* Rolla wordmark — the Ionicons "leaf" glyph, matching the mobile app. */
export function Logo({
  className = "",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
          onDark ? "bg-white/15" : "bg-primary/10"
        }`}
      >
        <LeafGlyph
          className="h-5 w-5"
          color={onDark ? "#FAF6EE" : "#1A3C2B"}
        />
      </span>
      <span
        className={`text-xl font-extrabold tracking-tight ${
          onDark ? "text-white" : "text-primary"
        }`}
      >
        Rolla
      </span>
    </span>
  );
}

/** Exact Ionicons `leaf` path (viewBox 512), so web matches mobile. */
export function LeafGlyph({
  className = "",
  color = "#1A3C2B",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden fill={color}>
      <path d="M161.35,242a16,16,0,0,1,22.62-.68c73.63,69.36,147.51,111.56,234.45,133.07,11.73-32,12.77-67.22,2.64-101.58-13.44-45.59-44.74-85.31-90.49-114.86-40.84-26.38-81.66-33.25-121.15-39.89-49.82-8.38-96.88-16.3-141.79-63.85-5-5.26-11.81-7.37-18.32-5.66-7.44,2-12.43,7.88-14.82,17.6-5.6,22.75-2,86.51,13.75,153.82,25.29,108.14,65.65,162.86,95.06,189.73,38,34.69,87.62,53.9,136.93,53.9A186,186,0,0,0,308,461.56c41.71-6.32,76.43-27.27,96-57.75-89.49-23.28-165.94-67.55-242-139.16A16,16,0,0,1,161.35,242Z" />
      <path d="M467.43,384.19c-16.83-2.59-33.13-5.84-49-9.77a157.71,157.71,0,0,1-12.13,25.68c-.73,1.25-1.5,2.49-2.29,3.71a584.21,584.21,0,0,0,58.56,12,16,16,0,1,0,4.87-31.62Z" />
    </svg>
  );
}
