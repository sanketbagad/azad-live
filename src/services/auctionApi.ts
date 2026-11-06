import { useCallback } from 'react';
import { useCricket } from '../context/CricketContext';

/** Thin client for /api/auction/*: throws an Error with the server's message on failure. */
export function useAuctionApi() {
  const { getAuthHeaders } = useCricket();

  const call = useCallback(
    async <T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> => {
      const res = await fetch(`/api/auction${path}`, {
        method,
        headers: await getAuthHeaders(),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data as T;
    },
    [getAuthHeaders]
  );

  return {
    live: (action: string, extra: Record<string, unknown> = {}) => call('POST', '/live', { action, ...extra }),
    sell: (extra: Record<string, unknown> = {}) => call('POST', '/sell', extra),
    unsold: (extra: Record<string, unknown> = {}) => call('POST', '/unsold', extra),
    savePlayer: (player: Record<string, unknown>) => call('POST', '/players', player),
    deletePlayer: (id: string) => call('DELETE', `/players/${encodeURIComponent(id)}`),
    uploadPhoto: (id: string, dataUrl: string) => call('POST', `/players/${encodeURIComponent(id)}/photo`, { dataUrl }),
    importData: (payload: Record<string, unknown>) => call('POST', '/import', payload),
    saveSettings: (payload: Record<string, unknown>) => call('PUT', '/settings', payload),
    saveTeams: (teams: { id?: string; name: string; shortName?: string; color?: string }[]) => call('PUT', '/teams', { teams }),
    topup: (teamId: string, amount: number) => call('POST', '/topup', { teamId, amount }),
    editRecord: (id: string, payload: { teamId: string; price: number }) => call('PUT', `/records/${encodeURIComponent(id)}`, payload),
    deleteRecord: (id: string) => call('DELETE', `/records/${encodeURIComponent(id)}`),
    startReauction: () => call('POST', '/reauction', {}),
    reset: (wipePlayers: boolean) => call('POST', '/reset', { wipePlayers }),
  };
}
