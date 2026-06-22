import { CircleUsersIcon, TrendingUpIcon, GiftIcon, WalletIcon } from "./icons";

/* A realistic iPhone rendering of the Rolla home screen, used in the hero.
   Titanium rail + Dynamic Island + status bar + home indicator wrap a screen
   that mirrors the real app: forest-green header + cream sheet with circles. */
export function AppPreview() {
  return (
    <div className="relative mx-auto w-[290px] sm:w-[320px]">
      {/* Ambient glow */}
      <div className="absolute -inset-10 -z-10 rounded-[4rem] bg-accent/10 blur-3xl" />
      <div className="absolute -bottom-6 -left-6 -z-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

      {/* Side buttons (on the titanium rail) */}
      <span className="absolute -left-[2px] top-[120px] h-7 w-[3px] rounded-l bg-zinc-700" />
      <span className="absolute -left-[2px] top-[164px] h-12 w-[3px] rounded-l bg-zinc-700" />
      <span className="absolute -left-[2px] top-[214px] h-12 w-[3px] rounded-l bg-zinc-700" />
      <span className="absolute -right-[2px] top-[180px] h-16 w-[3px] rounded-r bg-zinc-700" />

      {/* Titanium frame */}
      <div className="rounded-[3.4rem] bg-linear-to-br from-zinc-500 via-zinc-800 to-zinc-600 p-[2px] shadow-2xl">
        {/* Black bezel */}
        <div className="rounded-[3.3rem] bg-black p-[9px]">
          {/* Screen */}
          <div
            className="relative flex flex-col overflow-hidden rounded-[2.7rem] bg-surface"
            style={{ aspectRatio: "9 / 19.5" }}
          >
            {/* Dynamic Island */}
            <div className="absolute left-1/2 top-2.5 z-30 flex h-[26px] w-[86px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-2.5">
              <span className="h-2 w-2 rounded-full bg-zinc-800 ring-1 ring-zinc-700" />
            </div>

            {/* Header */}
            <div className="bg-primary px-5 pb-7 pt-3 text-white">
              <StatusBar />

              <div className="mt-4 flex items-start justify-between">
                <div>
                  <p className="text-[15px] font-bold">Hello, Amara</p>
                  <p className="mt-0.5 text-[11px] text-white/60">
                    Your savings, on your terms
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-white/15 ring-1 ring-white/20" />
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

            {/* Sheet (fills remaining screen height) */}
            <div className="-mt-4 flex-1 overflow-hidden rounded-t-3xl bg-surface px-4 pb-4 pt-5">
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

            {/* Bottom tab bar */}
            <div className="flex items-center justify-around border-t border-border bg-white px-2 pb-5 pt-2.5">
              <Tab icon={<HomeGlyph />} label="Home" active />
              <Tab icon={<CircleUsersIcon className="h-[18px] w-[18px]" />} label="Circles" />
              <Tab icon={<TrendingUpIcon className="h-[18px] w-[18px]" />} label="Vault" />
              <Tab icon={<WalletIcon className="h-[18px] w-[18px]" />} label="Wallet" />
            </div>

            {/* Home indicator */}
            <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 h-1 w-28 -translate-x-1/2 rounded-full bg-charcoal/70" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex h-[26px] items-center justify-between text-white">
      <span className="text-[12px] font-semibold tracking-tight">9:41</span>
      <div className="flex items-center gap-1.5">
        <SignalGlyph />
        <WifiGlyph />
        <BatteryGlyph />
      </div>
    </div>
  );
}

function SignalGlyph() {
  return (
    <svg viewBox="0 0 18 12" className="h-[11px] w-[17px]" fill="currentColor">
      <rect x="0" y="8" width="3" height="4" rx="0.6" />
      <rect x="5" y="5" width="3" height="7" rx="0.6" />
      <rect x="10" y="2.5" width="3" height="9.5" rx="0.6" />
      <rect x="15" y="0" width="3" height="12" rx="0.6" />
    </svg>
  );
}

function WifiGlyph() {
  return (
    <svg viewBox="0 0 16 12" className="h-[11px] w-[15px]" fill="currentColor">
      <path d="M8 2.4c2.6 0 5 1 6.8 2.7l-1.4 1.5A7.6 7.6 0 0 0 8 4.5 7.6 7.6 0 0 0 2.6 6.6L1.2 5.1A9.8 9.8 0 0 1 8 2.4Z" />
      <path d="M8 6.2c1.5 0 2.9.6 4 1.6l-1.5 1.5A3.6 3.6 0 0 0 8 8.3c-.9 0-1.8.4-2.5 1l-1.5-1.5a5.6 5.6 0 0 1 4-1.6Z" />
      <circle cx="8" cy="11" r="1.2" />
    </svg>
  );
}

function BatteryGlyph() {
  return (
    <svg viewBox="0 0 27 13" className="h-[12px] w-[25px]" fill="none">
      <rect
        x="0.5"
        y="0.5"
        width="22"
        height="12"
        rx="3.2"
        stroke="currentColor"
        strokeOpacity="0.45"
      />
      <rect x="2.2" y="2.2" width="16" height="8.6" rx="1.8" fill="currentColor" />
      <path
        d="M24.5 4.2c1.1.4 1.1 4.2 0 4.6Z"
        fill="currentColor"
        fillOpacity="0.45"
      />
    </svg>
  );
}

function HomeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function Tab({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 ${
        active ? "text-primary" : "text-muted"
      }`}
    >
      {icon}
      <span className="text-[9px] font-semibold">{label}</span>
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
