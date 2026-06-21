"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { buttonClasses, type ButtonVariant } from "./ui";
import { Logo } from "./Logo";
import { AppleIcon, DownloadIcon, CloseIcon } from "./icons";

/* A "Get app" trigger that opens a modal with the store options.
   Both options are pre-launch, so each shows a "Coming soon" badge. */
export function GetAppButton({
  children = "Get app",
  variant = "primary",
  className = "",
}: {
  children?: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses(variant, className)}
      >
        {children}
      </button>
      <GetAppModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function GetAppModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Only render the portal on the client (document is unavailable during SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Portal to <body> so the fixed overlay is centered against the viewport,
  // not trapped by the sticky header's backdrop-blur containing block.
  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Get the Rolla app"
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-charcoal/50 backdrop-blur-sm"
      />

      {/* panel */}
      <div className="rolla-rise relative w-full max-w-md rounded-4xl border border-border bg-white p-8 shadow-2xl sm:p-10">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-charcoal"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <Logo />

        <h3 className="mt-6 text-2xl font-extrabold tracking-tight text-charcoal">
          Get the Rolla app
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          Save with your circle and earn yield on the go. Launching soon on iOS
          and Android.
        </p>

        <div className="mt-7 space-y-3">
          <StoreOption
            icon={<AppleIcon className="h-7 w-7" />}
            sub="Download on the"
            title="App Store"
          />
          <StoreOption
            icon={<DownloadIcon className="h-6 w-6" />}
            sub="Android"
            title="Get the APK"
          />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Want to be first in line?{" "}
          <a href="#cta" className="font-semibold text-primary">
            Join the waitlist
          </a>
        </p>
      </div>
    </div>,
    document.body,
  );
}

function StoreOption({
  icon,
  sub,
  title,
}: {
  icon: ReactNode;
  sub: string;
  title: string;
}) {
  return (
    <div
      aria-disabled="true"
      className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-4 opacity-90"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">
          {sub}
        </span>
        <span className="block text-base font-bold text-charcoal">{title}</span>
      </span>
      <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-[#9a7411]">
        Coming soon
      </span>
    </div>
  );
}
