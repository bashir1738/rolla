import { Container, Section, SectionHeading } from "./ui";
import { WalletIcon, CircleUsersIcon, GiftIcon } from "./icons";

const STEPS = [
  {
    icon: WalletIcon,
    step: "01",
    title: "Connect your wallet",
    body: "Sign in with any wallet to get started. You stay in full custody of your funds — Rolla never holds your keys.",
  },
  {
    icon: CircleUsersIcon,
    step: "02",
    title: "Create or join a circle",
    body: "Set the amount, schedule, and members — or join one you're invited to. The rules are locked in onchain from day one.",
  },
  {
    icon: GiftIcon,
    step: "03",
    title: "Contribute & get paid",
    body: "Everyone pays in each round, and members receive the pot in turn. Idle funds earn yield until it's your time.",
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
