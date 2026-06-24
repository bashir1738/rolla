import { Magic } from '@magic-sdk/react-native-expo';

const MAGIC_API_KEY = process.env.EXPO_PUBLIC_MAGIC_API_KEY ?? '';
const SEPOLIA_RPC = process.env.EXPO_PUBLIC_SEPOLIA_RPC_URL ?? 'https://rpc.sepolia.org';

if (!MAGIC_API_KEY && __DEV__) {
  console.warn('[Rolla] Missing EXPO_PUBLIC_MAGIC_API_KEY — get one at magic.link');
}

export const magic = new Magic(MAGIC_API_KEY, {
  network: {
    rpcUrl: SEPOLIA_RPC,
    chainId: 11155111,
  },
});
