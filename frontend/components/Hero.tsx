import { Container, Button, Pill } from "./ui";
import { GetAppButton } from "./GetAppModal";
import { AppPreview } from "./AppPreview";
import { CheckIcon, ArrowRightIcon } from "./icons";

const HIGHLIGHTS = [
  "No middlemen",
  "Transparent payouts",
  "Earn while you save",
];

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-white">
      {/* soft background wash */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-surface blur-3xl" />
        <div className="absolute -right-32 top-40 h-96 w-96 rounded-full bg-sage/10 blur-3xl" />
      </div>

      <Container className="grid items-center gap-16 py-20 lg:grid-cols-2 lg:gap-12 lg:py-28">
        {/* Copy */}
        <div className="rolla-rise max-w-xl">
          <Pill tone="accent">Ajo &amp; Esusu, reimagined onchain</Pill>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-charcoal sm:text-5xl lg:text-6xl">
            Save together,
            <br />
            the <span className="text-primary">African</span> way.
          </h1>

          <p className="mt-6 max-w-md text-lg leading-8 text-muted">
            Rolla turns rotating savings circles into something you can trust —
            transparent, automated, and onchain. Save with your community and
            grow idle funds with built-in yield.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <GetAppButton className="h-13">
              Start a circle
              <ArrowRightIcon className="h-4 w-4" />
            </GetAppButton>
            <Button href="#how" variant="secondary" className="h-13">
              See how it works
            </Button>
          </div>

          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
            {HIGHLIGHTS.map((h) => (
              <li
                key={h}
                className="flex items-center gap-2 text-sm font-medium text-charcoal"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                  <CheckIcon className="h-3.5 w-3.5 text-primary" />
                </span>
                {h}
              </li>
            ))}
          </ul>
        </div>

        {/* Visual */}
        <div className="rolla-rise flex justify-center lg:justify-end">
          <AppPreview />
        </div>
      </Container>
    </div>
  );
}
