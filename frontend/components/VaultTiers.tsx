import { Container, Section, SectionHeading, Button } from "./ui";
import { CheckIcon, LockIcon, SparkIcon, BoltIcon } from "./icons";

const TIERS = [
  {
    name: "Flex",
    apr: "8.5%",
    icon: SparkIcon,
    lock: "No lock-up",
    min: "From $10",
    blurb: "Keep it flexible. Earn a little extra while you keep instant access to your money.",
    perks: ["Take it out anytime", "Grows every day", "Great for spare cash"],
    popular: false,
  },
  {
    name: "Growth",
    apr: "11.2%",
    icon: BoltIcon,
    lock: "90-day lock",
    min: "From $100",
    blurb: "A nice middle ground for savers who can set money aside for a season.",
    perks: ["Earns more", "Grows on itself", "Great for a savings goal"],
    popular: true,
  },
  {
    name: "Power",
    apr: "14.8%",
    icon: LockIcon,
    lock: "365-day lock",
    min: "From $500",
    blurb: "The most growth for savers who are in it for the long haul.",
    perks: ["Earns the most", "Priority payouts", "Grows all year long"],
    popular: false,
  },
];

export function VaultTiers() {
  return (
    <Section id="vaults" className="bg-white">
      <Container>
        <SectionHeading
          align="center"
          eyebrow="Save & Earn"
          title="Let your savings grow while they wait."
          description="Money that's waiting its turn can earn a little extra in the meantime. Pick the option that matches how long you're happy to leave it."
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {TIERS.map((t) => {
            const Icon = t.icon;
            const featured = t.popular;
            return (
              <div
                key={t.name}
                className={`relative flex flex-col rounded-4xl border p-8 transition-all duration-200 ${
                  featured
                    ? "border-primary bg-primary text-white shadow-xl lg:-translate-y-3"
                    : "border-border bg-white hover:shadow-lg"
                }`}
              >
                {featured && (
                  <span className="absolute right-8 top-8 rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary">
                    Popular
                  </span>
                )}

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    featured ? "bg-white/15 text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <h3
                  className={`mt-6 text-xl font-bold ${
                    featured ? "text-white" : "text-charcoal"
                  }`}
                >
                  {t.name} Vault
                </h3>

                <div className="mt-3 flex items-end gap-1.5">
                  <span
                    className={`text-4xl font-extrabold tracking-tight ${
                      featured ? "text-white" : "text-primary"
                    }`}
                  >
                    {t.apr}
                  </span>
                  <span
                    className={`pb-1.5 text-sm font-semibold ${
                      featured ? "text-white/70" : "text-muted"
                    }`}
                  >
                    APR
                  </span>
                </div>

                <p
                  className={`mt-1 text-xs font-semibold uppercase tracking-wider ${
                    featured ? "text-white/70" : "text-sage"
                  }`}
                >
                  {t.lock} · {t.min}
                </p>

                <p
                  className={`mt-5 text-sm leading-6 ${
                    featured ? "text-white/80" : "text-muted"
                  }`}
                >
                  {t.blurb}
                </p>

                <ul className="mt-6 space-y-3">
                  {t.perks.map((perk) => (
                    <li
                      key={perk}
                      className={`flex items-center gap-2.5 text-sm ${
                        featured ? "text-white/90" : "text-charcoal"
                      }`}
                    >
                      <CheckIcon
                        className={`h-4 w-4 shrink-0 ${
                          featured ? "text-accent" : "text-primary"
                        }`}
                      />
                      {perk}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 pt-2">
                  <Button
                    href="#cta"
                    variant={featured ? "secondary" : "primary"}
                    className="w-full"
                  >
                    Start with {t.name}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted">
          Rates shown are examples and can go up or down over time. Your savings
          are never locked away from you for longer than the term you pick.
        </p>
      </Container>
    </Section>
  );
}
