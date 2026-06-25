"use client";

import { useState, useEffect, useRef } from "react";
import type { Address } from "viem";
import {
  checkAvailable,
  lookupName,
  lookupOwner,
  getCooldown,
  buildClaimCalldata,
  REGISTRY_ADDRESS,
} from "../lib/registry";

type Step = "idle" | "checking" | "available" | "taken" | "connecting" |
            "claiming" | "success" | "error";

function fmtAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function fmtCooldown(ts: number) {
  const diff = ts - Math.floor(Date.now() / 1000);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function ClaimUsername() {
  const [input, setInput] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [ownerAddr, setOwnerAddr] = useState<string | null>(null);
  const [account, setAccount] = useState<Address | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-check availability as user types
  useEffect(() => {
    const name = input.trim().toLowerCase();
    if (!name) { setStep("idle"); setOwnerAddr(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setStep("checking");
      try {
        const ok = await checkAvailable(name);
        if (ok) {
          setStep("available");
          setOwnerAddr(null);
        } else {
          const owner = await lookupOwner(name);
          setOwnerAddr(owner);
          setStep("taken");
        }
      } catch {
        setStep("idle");
      }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input]);

  // When wallet connects, fetch their current name + cooldown
  useEffect(() => {
    if (!account) return;
    lookupName(account).then((n) => setMyName(n || null)).catch(() => {});
    getCooldown(account).then((ts) => setCooldown(fmtCooldown(ts))).catch(() => {});
  }, [account]);

  const connectWallet = async () => {
    const eth = (window as any).ethereum;
    if (!eth) {
      setErrorMsg("No wallet found. Install MetaMask or another browser wallet.");
      setStep("error");
      return;
    }
    setStep("connecting");
    try {
      const [addr] = await eth.request({ method: "eth_requestAccounts" }) as string[];
      setAccount(addr as Address);
      // Switch to Sepolia
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
      } catch (switchErr: any) {
        if (switchErr.code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0xaa36a7",
              chainName: "Sepolia",
              rpcUrls: ["https://rpc.sepolia.org"],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            }],
          });
        }
      }
      setStep("available"); // restore state
    } catch {
      setStep("available");
    }
  };

  const claimName = async () => {
    if (!account || !input.trim()) return;
    const name = input.trim().toLowerCase();
    setStep("claiming");
    setErrorMsg("");
    try {
      const eth = (window as any).ethereum;
      const hash = await eth.request({
        method: "eth_sendTransaction",
        params: [{
          from: account,
          to: REGISTRY_ADDRESS,
          data: buildClaimCalldata(name),
          gas: "0x186A0", // 100k gas limit
        }],
      });
      setTxHash(hash);
      setStep("success");
      setMyName(name);
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      if (msg.includes("NameTaken") || msg.includes("execution reverted")) {
        setErrorMsg("That name was just taken. Try another.");
      } else if (msg.includes("CooldownActive")) {
        setErrorMsg("24h cooldown between name changes.");
      } else if (msg.includes("user rejected")) {
        setErrorMsg("Transaction cancelled.");
      } else {
        setErrorMsg("Transaction failed. Try again.");
      }
      setStep("error");
    }
  };

  const reset = () => {
    setInput(""); setStep("idle"); setOwnerAddr(null);
    setErrorMsg(""); setTxHash(null);
  };

  const nameLower = input.trim().toLowerCase();
  const isClaiming = step === "claiming";
  const canClaim = step === "available" && !!account && !!nameLower && !cooldown;

  return (
    <div className="mx-auto max-w-lg">
      {/* Success state */}
      {step === "success" ? (
        <div className="rounded-3xl border border-border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-extrabold text-charcoal">@{nameLower} is yours!</h3>
          <p className="mt-2 text-sm text-muted">
            Your name is now linked to {fmtAddr(account!)} on Sepolia.
            It will show up on all your circles in the Rolla app.
          </p>
          {txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              View on Etherscan ↗
            </a>
          )}
          <button
            onClick={reset}
            className="mt-6 block w-full rounded-2xl border border-border py-3 text-sm font-semibold text-muted hover:bg-surface transition-colors"
          >
            Register another name
          </button>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
          {/* Input */}
          <div className="p-6">
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${
              step === "available" ? "border-primary bg-primary/3" :
              step === "taken"     ? "border-alert/60 bg-alert/3" :
              "border-border bg-surface/50"
            }`}>
              <span className="text-lg font-bold text-muted select-none">@</span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                placeholder="yourname"
                maxLength={32}
                className="flex-1 bg-transparent text-lg font-semibold text-charcoal placeholder:text-muted/50 outline-none"
                spellCheck={false}
                autoCapitalize="none"
              />
              {/* Status indicator */}
              {step === "checking" && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
              {step === "available" && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">Free</span>
              )}
              {step === "taken" && (
                <span className="rounded-full bg-alert/10 px-2.5 py-0.5 text-xs font-bold text-alert">Taken</span>
              )}
            </div>

            {/* Availability detail */}
            <div className="mt-3 min-h-[20px] text-sm">
              {step === "available" && (
                <p className="text-primary font-medium">✓ @{nameLower} is available</p>
              )}
              {step === "taken" && ownerAddr && (
                <p className="text-alert">
                  @{nameLower} is registered to{" "}
                  <a
                    href={`https://sepolia.etherscan.io/address/${ownerAddr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono hover:underline"
                  >
                    {fmtAddr(ownerAddr)}
                  </a>
                </p>
              )}
              {step === "error" && errorMsg && (
                <p className="text-alert">{errorMsg}</p>
              )}
            </div>
          </div>

          {/* Wallet + claim section */}
          <div className="border-t border-border bg-surface/40 p-6">
            {!account ? (
              <button
                onClick={connectWallet}
                disabled={step === "connecting"}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-white transition-opacity disabled:opacity-60"
              >
                {step === "connecting" ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Connecting…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a5 5 0 00-10 0v2M5 9h14l1 11H4L5 9z" />
                    </svg>
                    Connect wallet to claim
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                {/* Connected wallet pill */}
                <div className="flex items-center justify-between rounded-xl bg-white border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-400" />
                    <span className="font-mono text-xs text-charcoal">{fmtAddr(account)}</span>
                    {myName && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                        @{myName}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => { setAccount(null); setMyName(null); setCooldown(null); }}
                    className="text-xs text-muted hover:text-charcoal"
                  >
                    Disconnect
                  </button>
                </div>

                {/* Cooldown warning */}
                {cooldown && (
                  <p className="text-center text-xs text-muted">
                    ⏳ Name change available in {cooldown}
                  </p>
                )}

                <button
                  onClick={claimName}
                  disabled={!canClaim || isClaiming}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-sm font-bold text-primary transition-opacity disabled:opacity-40"
                >
                  {isClaiming ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Confirm in wallet…
                    </>
                  ) : (
                    <>
                      Claim @{nameLower || "yourname"}
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}

            <p className="mt-3 text-center text-xs text-muted">
              Free to claim · Gas only · 24h cooldown between changes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
