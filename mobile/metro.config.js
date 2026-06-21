const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Rolla only uses the WalletConnect connector. The `wagmi/connectors` barrel
// statically imports every connector (MetaMask, Coinbase, Gemini, Base, Porto),
// whose SDKs depend on Node-only modules (node:crypto, node:http, …) that Hermes
// cannot run. Redirect those unused SDK packages to an empty shim so they're
// excluded from the bundle.
const EMPTY_SHIM = path.resolve(__dirname, "shim-empty.js");
const SHIMMED_PACKAGES = [
  "@metamask/sdk",
  "@coinbase/wallet-sdk",
  "cbw-sdk",
  "@gemini-wallet/core",
  "@base-org/account",
  "porto",
];

// Reown AppKit's React-Native packages require valtio@1.13.2, but the *web*
// @reown/appkit (pulled by @walletconnect/ethereum-provider) hoists valtio@2 to
// the top level. valtio v2 changed the useSnapshot API, which breaks <AppKit />
// rendering. Point ONLY the RN AppKit packages at the bundled valtio@1.13.2,
// leaving the web appkit on the hoisted v2.
const RN_VALTIO_DIR = path.resolve(
  __dirname,
  "node_modules/@reown/appkit-core-react-native/node_modules/valtio"
);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Match a shimmed package by exact name or as a subpath (e.g. "porto/internal")
  const isShimmed = SHIMMED_PACKAGES.some(
    (pkg) => moduleName === pkg || moduleName.startsWith(`${pkg}/`)
  );
  if (isShimmed) {
    return { type: "sourceFile", filePath: EMPTY_SHIM };
  }

  // Redirect valtio to v1.13.2 only for Reown's react-native packages.
  if (moduleName === "valtio" || moduleName.startsWith("valtio/")) {
    const origin = context.originModulePath || "";
    const isReownRN =
      origin.includes(`${path.sep}@reown${path.sep}`) &&
      origin.includes("react-native");
    if (isReownRN) {
      const sub = moduleName === "valtio" ? "" : moduleName.slice("valtio".length);
      const target = path.join(RN_VALTIO_DIR, sub);
      return context.resolveRequest(context, target, platform);
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
