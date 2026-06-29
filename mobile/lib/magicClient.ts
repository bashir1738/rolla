// No static import of @magic-sdk/react-native-expo — its CJS bundle assigns
// global.URL = whatwg-url.URL at module load time, which strips URL.canParse
// from the Metro server process and breaks bundle requests. We require() it
// lazily inside getInstance() so it never loads during SSR/static render.

const MAGIC_API_KEY = process.env.EXPO_PUBLIC_MAGIC_API_KEY ?? '';
const SEPOLIA_RPC = process.env.EXPO_PUBLIC_SEPOLIA_RPC_URL ?? 'https://rpc.sepolia.org';

if (!MAGIC_API_KEY && __DEV__) {
  console.warn('[Rolla] Missing EXPO_PUBLIC_MAGIC_API_KEY — get one at magic.link');
}

let _instance: any | null = null;

function getInstance(): any | null {
  if (typeof window === 'undefined') return null;
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Magic } = require('@magic-sdk/react-native-expo');
    _instance = new Magic(MAGIC_API_KEY, {
      network: { rpcUrl: SEPOLIA_RPC, chainId: 11155111 },
    });
  }
  return _instance;
}

// Proxy defers instantiation until first property access so the Magic
// constructor (which references `window`) never runs during SSR/static render.
// During SSR, Relayer returns a no-op component and all other props are undefined.
export const magic: any = new Proxy({} as any, {
  get(_, prop: string | symbol) {
    const instance = getInstance();
    if (!instance) {
      if (prop === 'Relayer') return () => null;
      return undefined;
    }
    return instance[prop];
  },
});
