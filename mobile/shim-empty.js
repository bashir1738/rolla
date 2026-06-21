// Empty module shim — used to exclude unused wagmi connectors (MetaMask,
// Coinbase, Gemini, Base, Porto) from the bundle. Rolla only uses WalletConnect,
// and these SDKs pull in Node-only deps (node:crypto, etc.) that break Hermes.
module.exports = {};
