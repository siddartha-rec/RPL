import { useEffect, useRef } from 'react';
import type { AuctionEvent } from '../types';

const SSE_EVENT_TYPES = [
  'AUCTION_STARTED',
  'PLAYER_UP',
  'BID_PLACED',
  'BID_UNDONE',
  'PLAYER_SOLD',
  'PLAYER_UNSOLD',
  'AUCTION_PAUSED',
  'AUCTION_RESUMED',
  'DRAFT_PICK',
  'BUDGET_UPDATE',
  'BUDGET_UPDATED',
  'TIMER_TICK',
  'RETENTION_PICK',
  'AUCTION_COMPLETED',
  'DRAFT_STARTED',
];

export function useSse(auctionId: number | null, onEvent: (event: AuctionEvent) => void) {
  const callbackRef = useRef(onEvent);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!auctionId) return;

    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource(`/api/auctions/${auctionId}/stream`);

      SSE_EVENT_TYPES.forEach((type) => {
        es.addEventListener(type, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data) as Record<string, unknown>;
            callbackRef.current({ type, data });
          } catch {
            callbackRef.current({ type, data: {} });
          }
        });
      });

      es.onerror = () => {
        es.close();
        reconnectTimer = setTimeout(connect, 1500);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [auctionId]);
}
