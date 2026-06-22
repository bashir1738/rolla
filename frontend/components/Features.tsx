import type { ReactNode } from "react";
import { Container, Section, SectionHeading } from "./ui";
import {
  ShieldIcon,
  TrendingUpIcon,
  GlobeIcon,
  WalletIcon,
  BoltIcon,
  GiftIcon,
} from "./icons";

const FEATURES: {
  icon: (props: { className?: string }) => ReactNode;
  title: string;
  body: string;
}[] = [
  {
    icon: ShieldIcon,
    title: "Everyone plays fair",
    body: "The amount, the schedule, and whose turn is next are all agreed up front — and can't be changed. No skipped payments, no favorites, ever.",
  },
  {
    icon: TrendingUpIcon,
    title: "Your savings keep growing",
    body: "Money waiting for its turn doesn't just sit there. It quietly earns a little extra until your round comes around.",
  },
  {
    icon: WalletIcon,
    title: "Pay with what you have",
    body: "Chip in with whatever you've got. Rolla takes care of the rest behind the scenes, so every circle stays simple.",
  },
  {
    icon: GlobeIcon,
    title: "Save from anywhere",
    body: "Save with family and friends across borders. No bank branch, no transfer fees — just a shared circle that works from anywhere.",
  },
  {
    icon: GiftIcon,
    title: "Payouts you can see",
    body: "Every round, every payout, and whose turn is next is right there for the whole group to see. The pot is always exactly where it should be.",
  },
  {
    icon: BoltIcon,
    title: "Truly yours",
    body: "Your savings always belong to you. Rolla can't touch them, hold them, or lock you out — not now, not ever.",
  },
];

export function Features() {
  return (
    <Section className="bg-surface">
      <Container>
        <SectionHeading
          align="center"
          eyebrow="Why Rolla"
          title="Old tradition. New peace of mind."
          description="Everything you love about saving with your community — now safer, clearer, and easier to trust."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-4xl border border-border bg-white p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg font-bold text-charcoal">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">{f.body}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
