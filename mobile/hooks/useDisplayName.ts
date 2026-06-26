import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReadContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { USERNAME_REGISTRY_ABI } from '../constants/abis';

const localKey = (addr: string) => `rolla:name:${addr.toLowerCase()}`;

export function fmtAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Resolves a display name for any address — on-chain registry first, then local. */
export function useDisplayName(address?: `0x${string}`) {
  const queryClient = useQueryClient();
  const [localName, setLocalName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 1. On-chain read (works for ANY address, visible to everyone)
  const { data: onChainRaw, refetch: refetchOnChain } = useReadContract({
    address: CONTRACT_ADDRESSES.USERNAME_REGISTRY,
    abi: USERNAME_REGISTRY_ABI,
    functionName: 'nameOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const onChainName =
    typeof onChainRaw === 'string' && onChainRaw.length > 0 ? onChainRaw : null;

  // 2. Local AsyncStorage fallback (this user's own device only)
  const readLocal = useCallback(() => {
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

  useEffect(() => { readLocal(); }, [readLocal]);

  // Called AFTER a successful on-chain claim — persist locally and force UI refresh
  const saveLocal = useCallback(async (newName: string) => {
    if (!address) return;
    const trimmed = newName.trim().toLowerCase();
    await AsyncStorage.setItem(localKey(address), JSON.stringify({ name: trimmed }));
    setLocalName(trimmed);
    // Invalidate all nameOf reads so every component picks up the new name instantly
    queryClient.invalidateQueries({ queryKey: ['readContract'] });
    refetchOnChain();
  }, [address, queryClient, refetchOnChain]);

  // Called after a successful on-chain release()
  const clearLocal = useCallback(async () => {
    if (!address) return;
    await AsyncStorage.removeItem(localKey(address));
    setLocalName(null);
    queryClient.invalidateQueries({ queryKey: ['readContract'] });
    refetchOnChain();
  }, [address, queryClient, refetchOnChain]);

  // on-chain name wins over local name
  const name = onChainName ?? localName;
  const display = name ?? (address ? fmtAddr(address) : null);

  return { display, name, onChainName, localName, loaded, saveLocal, clearLocal, refetch: readLocal };
}
