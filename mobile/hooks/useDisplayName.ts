import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { USERNAME_REGISTRY_ABI } from '../constants/abis';

const localKey = (addr: string) => `rolla:name:${addr.toLowerCase()}`;

export function fmtAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Resolves a display name for any address — on-chain registry first, then local. */
export function useDisplayName(address?: `0x${string}`) {
  const [localName, setLocalName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 1. On-chain read (works for ANY address, visible to everyone)
  const { data: onChainRaw } = useReadContract({
    address: CONTRACT_ADDRESSES.USERNAME_REGISTRY,
    abi: USERNAME_REGISTRY_ABI,
    functionName: 'nameOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const onChainName =
    typeof onChainRaw === 'string' && onChainRaw.length > 0 ? onChainRaw : null;

  // 2. Local AsyncStorage fallback (this user's own device only)
  useEffect(() => {
    if (!address) { setLocalName(null); setLoaded(true); return; }
    setLoaded(false);
    AsyncStorage.getItem(localKey(address))
      .then(v => {
        if (!v) { setLocalName(null); return; }
        try {
          const parsed = JSON.parse(v);
          setLocalName(typeof parsed === 'object' ? (parsed.name ?? null) : parsed);
        } catch {
          setLocalName(v);
        }
      })
      .catch(() => setLocalName(null))
      .finally(() => setLoaded(true));
  }, [address]);

  const save = useCallback(async (newName: string, signature?: string) => {
    if (!address) return;
    const trimmed = newName.trim();
    const payload = JSON.stringify({ name: trimmed, sig: signature ?? null });
    await AsyncStorage.setItem(localKey(address), payload);
    setLocalName(trimmed);
  }, [address]);

  const clear = useCallback(async () => {
    if (!address) return;
    await AsyncStorage.removeItem(localKey(address));
    setLocalName(null);
  }, [address]);

  // on-chain name wins over local name
  const name = onChainName ?? localName;
  const display = name ?? (address ? fmtAddr(address) : null);

  return { display, name, onChainName, localName, loaded, save, clear };
}
