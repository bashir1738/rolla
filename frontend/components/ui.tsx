import type { ReactNode } from "react";

/* ----------------------------------------------------------------------------
 * Shared layout + display primitives for the Rolla marketing site.
 * Kept dependency-free and presentational only — this frontend just displays
 * the platform.
 * ------------------------------------------------------------------------- */

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-8xl px-6 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

export function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`py-24 sm:py-32 ${className}`}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
}) {
  const isCenter = align === "center";
  return (
    <div className={isCenter ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-charcoal sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-lg leading-8 text-muted">{description}</p>
      )}
    </div>
  );
}

export type ButtonVariant = "primary" | "secondary" | "ghost";

/** Shared button styles, so links and real <button>s can match exactly. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  className = "",
) {
  const base =
    "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-all duration-200";
  const variants = {
    primary:
      "bg-primary text-white shadow-sm hover:bg-primary-700 hover:shadow-md",
    secondary:
      "border border-border bg-white text-primary hover:border-primary/30 hover:bg-surface",
    ghost: "text-primary hover:text-primary-700",
  } as const;

  return `${base} ${variants[variant]} ${className}`;
}

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  className?: string;
};

export function Button({
  children,
  href = "#",
  variant = "primary",
  className = "",
}: ButtonProps) {
  return (
    <a href={href} className={buttonClasses(variant, className)}>
      {children}
    </a>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "sage";
}) {
  const tones = {
    neutral: "bg-surface text-muted",
    accent: "bg-accent/15 text-[#9a7411]",
    sage: "bg-sage/20 text-primary",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-4xl border border-border bg-white p-8 ${className}`}
    >
      {children}
    </div>
  );
}
