import { Container, Section, Eyebrow } from "./ui";
import { ClaimUsername } from "./ClaimUsername";

export function UsernameSection() {
  return (
    <Section id="username" className="bg-surface">
      <Container>
        <div className="mx-auto max-w-2xl text-center mb-12">
          <Eyebrow>On-chain identity</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-charcoal sm:text-4xl">
            Claim your Rolla name
          </h2>
          <p className="mt-4 text-lg text-muted">
            Register a username and it follows your wallet everywhere on Rolla —
            every circle, every payout, every member row. One name, one wallet,
            fully on-chain.
          </p>
        </div>

        <ClaimUsername />

        {/* Feature pills */}
        <ul className="mt-10 flex flex-wrap justify-center gap-3">
          {[
            "Visible to all circle members",
            "Unique across Rolla",
            "Case-insensitive",
            "Change anytime (24h cooldown)",
            "Free — pay gas only",
          ].map((f) => (
            <li
              key={f}
              className="rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-muted"
            >
              {f}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
