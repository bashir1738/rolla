const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// wagmi's `wagmi/connectors` barrel statically imports external connector SDKs
// (MetaMask, Coinbase, Gemini, Base, Porto) that depend on Node-only modules
// (node:crypto, node:http, …) Hermes can't run. Shim them to an empty module.
const EMPTY_SHIM = path.resolve(__dirname, "shim-empty.js");
const SHIMMED_PACKAGES = [
  "@metamask/sdk",
  "@coinbase/wallet-sdk",
  "cbw-sdk",
  "@gemini-wallet/core",
  "@base-org/account",
  "porto",
];

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isShimmed = SHIMMED_PACKAGES.some(
    (pkg) => moduleName === pkg || moduleName.startsWith(`${pkg}/`)
  );
  if (isShimmed) {
    return { type: "sourceFile", filePath: EMPTY_SHIM };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
