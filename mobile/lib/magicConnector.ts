import { createConnector } from 'wagmi';
import { getAddress, type Address, type EIP1193Provider } from 'viem';
import { magic } from './magicClient';

export const MAGIC_CONNECTOR_ID = 'magic-embedded';

// Sepolia chain ID — must match the network configured in magicClient.ts.
const SEPOLIA_CHAIN_ID = 11155111;

export function magicConnector() {
  return createConnector<EIP1193Provider>((config) => {
    // The WebView-based rpcProvider is only needed for signing/sending.
    // Account and chain queries go through magic.wallet.getInfo() which
    // is session-based and doesn't require the WebView to be fully ready.
    async function getMagicAddress(): Promise<Address> {
      // eth_accounts is more reliable than getInfo().publicAddress in SDK v34+
      const provider = magic.rpcProvider as unknown as EIP1193Provider;
      const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
      const addr = accounts?.[0];
      if (!addr) throw new Error('Magic: no wallet address in session.');
      return getAddress(addr);
    }

    function getSigningProvider(): EIP1193Provider {
      return magic.rpcProvider as unknown as EIP1193Provider;
    }

    function onAccountsChanged(accounts: string[]) {
      if (accounts.length === 0) config.emitter.emit('disconnect');
      else config.emitter.emit('change', { accounts: accounts.map((a) => getAddress(a)) });
    }
    function onChainChanged(chain: string) {
      config.emitter.emit('change', { chainId: Number(chain) });
    }
    function onDisconnect() {
      config.emitter.emit('disconnect');
    }

    return {
      id: MAGIC_CONNECTOR_ID,
      name: 'Rolla Wallet',
      type: 'magic',

      async setup() {},

      async connect() {
        const address = await getMagicAddress();

        // Attach listeners to the signing provider for real-time updates.
        const p = getSigningProvider();
        try {
          p.on('accountsChanged', onAccountsChanged);
          p.on('chainChanged', onChainChanged);
          p.on('disconnect', onDisconnect);
        } catch {}

        return {
          accounts: [address] as never,
          chainId: SEPOLIA_CHAIN_ID,
        };
      },

      async disconnect() {
        try {
          const p = getSigningProvider();
          p.removeListener('accountsChanged', onAccountsChanged);
          p.removeListener('chainChanged', onChainChanged);
          p.removeListener('disconnect', onDisconnect);
        } catch {}
      },

      async getAccounts() {
        const address = await getMagicAddress();
        return [address];
      },

      async getChainId() {
        return SEPOLIA_CHAIN_ID;
      },

      // The signing provider is only used for eth_sendTransaction / eth_sign etc.
      async getProvider() {
        return getSigningProvider();
      },

      async isAuthorized() {
        try {
          return await magic.user.isLoggedIn();
        } catch {
          return false;
        }
      },

      async switchChain({ chainId }) {
        const chain = config.chains.find((c) => c.id === chainId);
        if (!chain) throw new Error(`Chain ${chainId} not configured.`);
        config.emitter.emit('change', { chainId });
        return chain;
      },

      onAccountsChanged,
      onChainChanged,
      onDisconnect,
    };
  });
}
