import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRefresh() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Invalidating all queries causes every wagmi useReadContract /
      // useReadContracts hook in the tree to re-fetch from the chain.
      await queryClient.invalidateQueries();
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  }, [queryClient]);

  return { refreshing, refresh };
}
