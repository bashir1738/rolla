import { CircleUsersIcon, TrendingUpIcon, GiftIcon } from "./icons";

/* A stylized rendering of the Rolla mobile home screen, used in the hero.
   Mirrors the real app: forest-green header + cream sheet with circle cards. */
export function AppPreview() {
  return (
    <div className="relative mx-auto w-[300px] sm:w-[330px]">
      {/* Glow */}
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-accent/10 blur-2xl" />

      <div className="overflow-hidden rounded-[2.6rem] border-[10px] border-charcoal bg-charcoal shadow-2xl">
        <div className="overflow-hidden rounded-[2rem] bg-surface">
          {/* Header */}
          <div className="bg-primary px-5 pb-7 pt-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[15px] font-bold">Hello, Amara</p>
                <p className="mt-0.5 text-[11px] text-white/60">
                  Your savings, on your terms
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-white/15" />
            </div>

            <p className="mt-6 text-[10px] uppercase tracking-[0.18em] text-white/60">
              Total in Circles
            </p>
            <p className="mt-1 text-3xl font-extrabold">$4,820.00</p>
            <div className="mt-3 flex gap-4 text-[11px] text-white/80">
              <Stat dot="#4ADE80" label="3 active" />
              <Stat dot="#D4A017" label="1 payout" />
              <Stat dot="rgba(255,255,255,0.6)" label="5 circles" />
            </div>
          </div>

          {/* Sheet */}
          <div className="-mt-4 rounded-t-3xl bg-surface px-4 pb-6 pt-5">
            {/* Payout alert */}
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-accent/40 bg-accent/15 p-3">
              <GiftIcon className="h-4 w-4 shrink-0 text-accent" />
              <p className="text-[11px] font-semibold leading-4 text-charcoal">
                Your payout is ready — claim $1,200 from Lagos Traders
              </p>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-bold text-charcoal">
                Your Circles
              </p>
              <span className="text-[12px] font-bold text-primary">+ New</span>
            </div>

            <MiniCircle
              name="Lagos Traders"
              members="8 members"
              amount="$150 / wk"
              progress={0.7}
            />
            <MiniCircle
              name="Family Pool"
              members="5 members"
              amount="$80 / wk"
              progress={0.4}
            />

            {/* Vault teaser */}
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex-1">
                <p className="text-[12px] font-bold text-primary">
                  Earn up to 14.8% APR
                </p>
                <p className="mt-0.5 text-[10px] text-muted">
                  Put idle savings to work →
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <TrendingUpIcon className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: dot }}
      />
      {label}
    </span>
  );
}

function MiniCircle({
  name,
  members,
  amount,
  progress,
}: {
  name: string;
  members: string;
  amount: string;
  progress: number;
}) {
  return (
    <div className="mb-2.5 rounded-2xl border border-border bg-white p-3.5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <CircleUsersIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-[12px] font-bold text-charcoal">{name}</p>
          <p className="text-[10px] text-muted">{members}</p>
        </div>
        <p className="text-[12px] font-extrabold text-primary">{amount}</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
