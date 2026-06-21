import { Container, Section, Button } from "./ui";
import { GetAppButton } from "./GetAppModal";
import { ArrowRightIcon } from "./icons";

export function CTA() {
  return (
    <Section id="cta" className="bg-surface">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-charcoal sm:text-4xl">
            Your community is already saving.
            <br />
            Make it count.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-muted">
            Start a circle in minutes, or earn yield on what you already hold.
            It&apos;s your money, on your terms.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GetAppButton className="h-13 px-8">
              Launch app
              <ArrowRightIcon className="h-4 w-4" />
            </GetAppButton>
            <Button href="#how" variant="secondary" className="h-13 px-8">
              Read the docs
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted">
            Free to start · Non-custodial · No hidden fees
          </p>
        </div>
      </Container>
    </Section>
  );
}
