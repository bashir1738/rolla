import { Container, Section, SectionHeading, Pill } from "./ui";
import { CircleUsersIcon, GiftIcon, CheckIcon } from "./icons";

const POINTS = [
  "Invite people you trust — agree on the amount and schedule.",
  "Everyone chips in each round, automatically.",
  "One member gets the full pot each round, taking turns until everyone's been paid.",
];

export function CirclesShowcase() {
  return (
    <Section id="circles" className="bg-white">
      <Container className="grid items-center gap-16 lg:grid-cols-2">
        {/* Visual — a circle card with rotating payout list */}
        <div className="order-2 lg:order-1">
          <div className="rounded-4xl border border-border bg-surface p-7 sm:p-9">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <CircleUsersIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-base font-bold text-charcoal">
                    Lagos Traders
                  </p>
                  <p className="text-xs text-muted">8 members · $150 weekly</p>
                </div>
              </div>
              <Pill tone="sage">Round 6 / 8</Pill>
            </div>

            <div className="mt-6 rounded-2xl bg-white p-5">
              <p className="text-xs uppercase tracking-widest text-muted">
                This round&apos;s pot
              </p>
              <p className="mt-1 text-3xl font-extrabold text-primary">
                $1,200.00
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full w-[75%] rounded-full bg-accent" />
              </div>
              <p className="mt-2 text-xs text-muted">
                6 of 8 contributions collected
              </p>
            </div>

            <div className="mt-5 space-y-2.5">
              {[
                { name: "Amara", status: "paid", round: "Round 4" },
                { name: "Tunde", status: "paid", round: "Round 5" },
                { name: "You", status: "next", round: "Round 6" },
              ].map((m) => (
                <div
                  key={m.name}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                    m.status === "next"
                      ? "border-accent/40 bg-accent/10"
                      : "border-border bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {m.name[0]}
                    </div>
                    <span className="text-sm font-semibold text-charcoal">
                      {m.name}
                    </span>
                  </div>
                  {m.status === "next" ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#9a7411]">
                      <GiftIcon className="h-4 w-4" /> Up next · {m.round}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-sage">
                      <CheckIcon className="h-4 w-4" /> Paid · {m.round}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="order-1 lg:order-2">
          <SectionHeading
            eyebrow="Savings Circles"
            title="The ajo you grew up with — now fair for everyone."
            description="It's the savings circle you already know — ajo, esusu, tontine. Everyone chips in the same amount each round, and members take turns getting the full pot. Rolla keeps everyone honest, so no one skips a payment or disappears, and every payout is there for the group to see."
          />

          <ul className="mt-9 space-y-5">
            {POINTS.map((p, i) => (
              <li key={p} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="pt-1 text-base leading-7 text-charcoal">{p}</p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
