import { Container, Section } from "./ui";
import { ShieldIcon, LockIcon, GlobeIcon, CheckIcon } from "./icons";

const ASSURANCES = [
  {
    icon: ShieldIcon,
    title: "Your money stays yours",
    body: "Only you can touch your savings. Rolla can never move your money in any way your group didn't agree to.",
  },
  {
    icon: LockIcon,
    title: "Rules that can't be bent",
    body: "The way your circle works is set up front and out in the open — so the rules can never quietly change on you.",
  },
  {
    icon: GlobeIcon,
    title: "Everything out in the open",
    body: "Every payment and payout is recorded for the whole group to see, so you can always check for yourself.",
  },
];

const CHECKLIST = [
  "Money only moves the way your group agreed",
  "No hidden fees, no middlemen",
  "Take your money out whenever it's yours to take",
];

export function Security() {
  return (
    <Section id="security" className="bg-white">
      <Container>
        <div className="relative overflow-hidden rounded-4xl border border-border bg-surface px-8 py-16 sm:px-14 sm:py-20">
          {/* soft warm glows */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-sage/10 blur-3xl" />

          <div className="relative grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-20">
            {/* Left — message */}
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Safe &amp; sound
              </span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-charcoal sm:text-4xl">
                Built so you never have to wonder where the money is.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-8 text-muted">
                The savings circles you grew up with run on trust alone. Rolla
                keeps the trust — and shows you the proof.
              </p>

              <ul className="mt-9 space-y-4">
                {CHECKLIST.map((line) => (
                  <li
                    key={line}
                    className="flex items-center gap-3 text-[15px] text-charcoal"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <CheckIcon className="h-3.5 w-3.5 text-primary" />
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
                    className="group flex gap-5 rounded-3xl border border-border bg-white p-6 transition-all hover:border-accent/40 hover:shadow-lg"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-charcoal">
                        {a.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 text-muted">
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
