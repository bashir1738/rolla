// Custom entry point. Polyfills MUST run before expo-router/entry so that
// globalThis.crypto.getRandomValues exists before any module (notably
// @noble/hashes, used by viem/WalletConnect) captures it at load time.
require('./polyfills');
require('expo-router/entry');
