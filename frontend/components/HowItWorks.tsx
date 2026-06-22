import { Container, Section, SectionHeading } from "./ui";
import { WalletIcon, CircleUsersIcon, GiftIcon } from "./icons";

const STEPS = [
  {
    icon: WalletIcon,
    step: "01",
    title: "Sign in",
    body: "Get started in moments with your wallet. Your money stays in your hands the whole time.",
  },
  {
    icon: CircleUsersIcon,
    step: "02",
    title: "Start or join a circle",
    body: "Pick the amount, the schedule, and who's in — or join one you've been invited to. Everyone agrees on the rules from day one.",
  },
  {
    icon: GiftIcon,
    step: "03",
    title: "Save & get paid",
    body: "Everyone pays in each round, and members get the full pot in turn. While you wait, your money earns a little extra.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how" className="bg-surface">
      <Container>
        <SectionHeading
          align="center"
          eyebrow="How it works"
          title="Three steps to your first circle."
          description="No paperwork, no waiting on a collector. Just open the app and start saving."
        />

        <div className="relative mt-16 grid gap-8 lg:grid-cols-3">
          {/* connecting line */}
          <div className="absolute left-0 right-0 top-9 hidden h-px bg-border lg:block" />

          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="relative">
                <div className="flex h-18 w-18 items-center justify-center rounded-3xl border border-border bg-white shadow-sm">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <p className="mt-6 text-xs font-bold tracking-[0.2em] text-accent">
                  STEP {s.step}
                </p>
                <h3 className="mt-2 text-xl font-bold text-charcoal">
                  {s.title}
                </h3>
                <p className="mt-3 max-w-sm text-base leading-7 text-muted">
                  {s.body}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
