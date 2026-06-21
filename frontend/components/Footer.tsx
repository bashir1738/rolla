import { Logo } from "./Logo";

const LINKS = [
  { label: "Circles", href: "#circles" },
  { label: "Save & Earn", href: "#vaults" },
  { label: "How it works", href: "#how" },
  { label: "Security", href: "#security" },
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-8xl flex-col items-center gap-8 px-6 py-12 sm:px-8 md:flex-row md:justify-between">
        <Logo />

        <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-muted transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <p className="text-xs text-muted">
          © {new Date().getFullYear()} Rolla
        </p>
      </div>
    </footer>
  );
}
