import { Container } from "./ui";

const STATS = [
  { value: "14.8%", label: "Max APR on idle savings" },
  { value: "$0", label: "Hidden fees, ever" },
  { value: "100%", label: "Onchain & transparent" },
  { value: "24/7", label: "Withdraw on your terms" },
];

export function Stats() {
  return (
    <Container>
      <div className="grid grid-cols-2 gap-y-10 rounded-4xl border border-border bg-surface px-8 py-12 sm:px-12 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
              {s.value}
            </p>
            <p className="mx-auto mt-2 max-w-[10rem] text-sm leading-5 text-muted">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </Container>
  );
}
