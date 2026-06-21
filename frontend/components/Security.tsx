import { Container, Section } from "./ui";
import { ShieldIcon, LockIcon, GlobeIcon, CheckIcon } from "./icons";

const ASSURANCES = [
  {
    icon: ShieldIcon,
    title: "Self-custody by default",
    body: "Your wallet, your keys, your funds. Rolla can never move money outside the rules you agreed to.",
  },
  {
    icon: LockIcon,
    title: "Audited smart contracts",
    body: "Circle and vault logic is open, tested, and verifiable — so the rules can't quietly change.",
  },
  {
    icon: GlobeIcon,
    title: "Transparent on Ethereum",
    body: "Every contribution and payout settles onchain, where anyone can verify it independently.",
  },
];

const CHECKLIST = [
  "Funds released strictly by the circle's rules",
  "No hidden fees or custodial middlemen",
  "Withdraw on your terms, verifiably",
];

export function Security() {
  return (
    <Section id="security" className="bg-white">
      <Container>
        <div className="relative overflow-hidden rounded-4xl bg-primary px-8 py-16 sm:px-14 sm:py-20">
          {/* soft brand glow */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

          <div className="relative grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-20">
            {/* Left — message */}
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Security &amp; trust
              </span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                Built so you never have to wonder where the money is.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-8 text-white/70">
                Traditional savings circles run on trust alone. Rolla keeps the
                trust — and adds proof.
              </p>

              <ul className="mt-9 space-y-4">
                {CHECKLIST.map((line) => (
                  <li
                    key={line}
                    className="flex items-center gap-3 text-[15px] text-white/90"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20">
                      <CheckIcon className="h-3.5 w-3.5 text-accent" />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — assurance cards */}
            <div className="space-y-4">
              {ASSURANCES.map((a) => {
                const Icon = a.icon;
                return (
                  <div
                    key={a.title}
                    className="group flex gap-5 rounded-3xl border border-white/10 bg-white/[0.06] p-6 transition-colors hover:border-accent/30 hover:bg-white/[0.1]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent transition-colors group-hover:bg-accent group-hover:text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {a.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 text-white/65">
                        {a.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
