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
    title: "Trust, enforced by code",
    body: "Contributions and payouts follow rules locked into a smart contract. No defaults, no favoritism — just the agreement everyone signed up for.",
  },
  {
    icon: TrendingUpIcon,
    title: "Yield on idle savings",
    body: "Funds waiting for their turn don't sit still. Route them into vaults earning real yield, then pull out when it's your round.",
  },
  {
    icon: WalletIcon,
    title: "Deposit any token",
    body: "Pay in with what you hold. Rolla converts to a stable USDT base under the hood so circles stay simple and steady.",
  },
  {
    icon: GlobeIcon,
    title: "For the diaspora",
    body: "Save across borders with family and friends. No bank branch, no wire fees — just a shared circle that works from anywhere.",
  },
  {
    icon: GiftIcon,
    title: "Payouts you can see",
    body: "Every round, every claim, every member's turn is visible and verifiable. The pot is always exactly where it should be.",
  },
  {
    icon: BoltIcon,
    title: "Built on Ethereum",
    body: "Settled onchain for transparency and self-custody. Your savings belong to you — Rolla never holds the keys.",
  },
];

export function Features() {
  return (
    <Section className="bg-surface">
      <Container>
        <SectionHeading
          align="center"
          eyebrow="Why Rolla"
          title="Old tradition. New guarantees."
          description="Everything you love about community savings, with the safety and transparency of an open ledger."
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
