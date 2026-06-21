import { Logo } from "./Logo";
import { GetAppButton } from "./GetAppModal";

const LINKS = [
  { label: "Circles", href: "#circles" },
  { label: "Save & Earn", href: "#vaults" },
  { label: "How it works", href: "#how" },
  { label: "Security", href: "#security" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-8xl items-center justify-between px-6 py-4 sm:px-8">
        <Logo />

        <nav className="hidden items-center gap-9 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-muted transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <GetAppButton>GET APP</GetAppButton>
        </div>
      </div>
    </header>
  );
}
