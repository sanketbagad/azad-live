import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { AuctionPlayerRecord } from '../types/cricket';

export function useAuctionSync() {
  const [auctionPlayers, setAuctionPlayers] = useState<Record<string, AuctionPlayerRecord>>({});
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const path = 'kpl_auction_players';
    setSyncStatus('connecting');

    try {
      const q = query(collection(db, path));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const playersMap: Record<string, AuctionPlayerRecord> = {};
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as AuctionPlayerRecord;
            playersMap[docSnap.id] = {
              ...data,
              id: docSnap.id,
            };
          });
          setAuctionPlayers(playersMap);
          setSyncStatus('connected');
          setLastSyncTime(Date.now());
          setErrorMessage(null);
        },
        (error) => {
          setSyncStatus('error');
          setErrorMessage(error.message);
          handleFirestoreError(error, OperationType.GET, path);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      setSyncStatus('error');
      setErrorMessage(err.message || 'Failed to attach auction listener');
    }
  }, []);

  const stats = useMemo(() => {
    const list = Object.values(auctionPlayers);
    const sold = list.filter((p) => p.soldStatus === 'SOLD');
    const unsold = list.filter((p) => p.soldStatus === 'UNSOLD');
    const inAuction = list.find((p) => p.soldStatus === 'IN_AUCTION') || null;
    const upcoming = list.filter((p) => p.soldStatus === 'UPCOMING');
    const totalSpent = sold.reduce((acc, p) => acc + (p.soldPrice || 0), 0);

    return {
      total: list.length,
      soldCount: sold.length,
      unsoldCount: unsold.length,
      upcomingCount: upcoming.length,
      inAuctionPlayer: inAuction,
      totalSpent,
    };
  }, [auctionPlayers]);

  return {
    auctionPlayers,
    syncStatus,
    lastSyncTime,
    errorMessage,
    stats,
  };
}
