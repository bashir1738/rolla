/* eslint-disable @typescript-eslint/no-var-requires */
// Polyfills for wagmi + WalletConnect / Reown AppKit on React Native.
// MUST be imported before any wagmi code evaluates.
//
// IMPORTANT: This file uses require() (not import) for the native packages so a
// missing native module (e.g. in Expo Go) can be caught instead of aborting the
// whole module. The pure-JS crypto fallback is installed FIRST so it is always
// in place even if every native package below fails to load.

declare const global: any;
const g: any =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof global !== 'undefined'
    ? global
    : {};

// ── 1. Guaranteed pure-JS crypto.getRandomValues (no native deps) ─────────────
function jsGetRandomValues(array: any) {
  const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return array;
}

function ensureGetRandomValues() {
  if (typeof g.crypto !== 'object' || g.crypto === null) {
    try {
      g.crypto = {};
    } catch {
      try {
        Object.defineProperty(g, 'crypto', { value: {}, configurable: true, writable: true });
      } catch {}
    }
  }
  if (typeof g.crypto.getRandomValues !== 'function') {
    try {
      g.crypto.getRandomValues = jsGetRandomValues;
    } catch {
      try {
        Object.defineProperty(g.crypto, 'getRandomValues', {
          value: jsGetRandomValues,
          configurable: true,
          writable: true,
        });
      } catch {}
    }
  }
}

ensureGetRandomValues();

// ── 2. Try the native secure RNG (works only in real dev/prod builds) ─────────
try {
  require('react-native-get-random-values');
  // Verify it actually works — in Expo Go it may be a stub that throws on call.
  g.crypto.getRandomValues(new Uint8Array(1));
} catch {
  // Native unavailable — restore the JS fallback (the native import may have
  // overwritten getRandomValues with a throwing stub).
  try {
    g.crypto.getRandomValues = jsGetRandomValues;
  } catch {}
}

// ── 3. WalletConnect RN compat (window, TextEncoder, URL, …) ──────────────────
try {
  require('@walletconnect/react-native-compat');
} catch {}

// ── 4. compat may have replaced global.crypto — re-ensure getRandomValues ─────
ensureGetRandomValues();
try {
  // Final smoke test; if the current impl throws, force the JS fallback.
  g.crypto.getRandomValues(new Uint8Array(1));
} catch {
  try {
    g.crypto.getRandomValues = jsGetRandomValues;
  } catch {}
}

// ── 5. Suppress noisy WalletConnect unhandled promise rejections ──────────────
// The WC relay can deliver session events (e.g. a `chainChanged` that triggers
// switchEthereumChain, or an event for a session the wallet already dropped)
// that reject deep inside SignClient. These surface as "Uncaught (in promise)"
// rejections — which ErrorUtils.setGlobalHandler does NOT catch.
//
// IMPORTANT: with the new architecture the app runs on Hermes, which uses its
// OWN native Promise. Hooking the `promise` npm package therefore does nothing —
// the rejections must be intercepted via HermesInternal's rejection tracker.
const WC_NOISE = [
  "Cannot read property 'request' of undefined",
  "Cannot read properties of undefined (reading 'request')",
  "session topic doesn't exist",
  'No matching key',
  'Missing or invalid. session topic',
  'session is not connected',
  'provider is not initialized',
  'switchEthereumChain',
  'isValidSessionTopic',
];

let wcStorageCleared = false;
function clearStaleWCStorage() {
  if (wcStorageCleared) return;
  wcStorageCleared = true;
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getAllKeys()
      .then((keys: string[]) => {
        const stale = keys.filter(
          (k) => k.startsWith('wc@') || k.startsWith('@walletconnect') || k.includes('WALLETCONNECT'),
        );
        if (stale.length > 0) return AsyncStorage.multiRemove(stale);
      })
      .catch(() => {});
  } catch {}
}

function isWCNoise(message: string) {
  return WC_NOISE.some((p) => message.includes(p));
}

const rejectionHandler = {
  allRejections: true,
  onUnhandled: (id: number, error: any) => {
    const message = (error && (error.message || String(error))) || '';
    if (isWCNoise(message)) {
      // A dead session topic will keep firing every launch until storage is
      // wiped — clear the WC keys once so it doesn't recur next start.
      if (message.includes("session topic doesn't exist") || message.includes('No matching key')) {
        clearStaleWCStorage();
      }
      return; // swallow WC noise
    }
    // Preserve visibility for every other rejection (console.error → LogBox).
    // eslint-disable-next-line no-console
    console.error(`Possible unhandled promise rejection (id: ${id}):`, error);
  },
  onHandled: () => {},
};

// Hermes path (default under the new architecture).
const hermes: any = (g as any).HermesInternal;
if (hermes && typeof hermes.enablePromiseRejectionTracker === 'function') {
  try {
    hermes.enablePromiseRejectionTracker(rejectionHandler);
  } catch {}
} else {
  // Fallback for JSC / non-Hermes runtimes.
  try {
    require('promise/setimmediate/rejection-tracking').enable(rejectionHandler);
  } catch {}
}
