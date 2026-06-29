import { useEffect, useRef, useCallback } from 'react';

interface PriceUpdate {
  address: string;
  price: number;
}

interface StreamMessage {
  type: 'connected' | 'price_update';
  data?: Record<string, { value: number }>;
  addresses?: string[];
}

type Handler = (updates: PriceUpdate[]) => void;

export function useTokenStream(addresses: string[], onUpdate: Handler) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (addresses.length === 0) return;

    const url = `/api/token-stream?tokens=${addresses.join(',')}`;
    const source = new EventSource(url);

    source.onmessage = (event) => {
      try {
        const msg: StreamMessage = JSON.parse(event.data);
        if (msg.type === 'price_update' && msg.data) {
          const updates: PriceUpdate[] = Object.entries(msg.data).map(([address, info]) => ({
            address,
            price: info.value,
          }));
          onUpdateRef.current(updates);
        }
      } catch {
        // silent
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }, [addresses.join(',')]);
}
