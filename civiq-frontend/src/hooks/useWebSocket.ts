import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE_URL } from '@/services/api';

export interface WsEvent {
  type: string;
  payload: unknown;
  at: string;
}

type Handler = (e: WsEvent) => void;

const MOCK_POOL = ['activity', 'conflict', 'copilot', 'risk'];

/** Native WebSocket when backend WS is configured, mock ticker otherwise. */
export function useWebSocket(channels: string[] = [], enabled = true) {
  const [connected, setConnected] = useState(false);
  const [source, setSource] = useState<'socket' | 'mock' | 'off'>('off');
  const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);
  const handlers = useRef<Set<Handler>>(new Set());

  const subscribe = useCallback((h: Handler) => {
    handlers.current.add(h);
    return () => { handlers.current.delete(h); };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const emit = (e: WsEvent) => {
      if (channels.length === 0 || channels.includes(e.type)) {
        setLastEvent(e);
        handlers.current.forEach((h) => h(e));
      }
    };

    const useMock = import.meta.env.DEV && import.meta.env.VITE_USE_MSW !== 'false';
    if (useMock) {
      setConnected(true);
      setSource('mock');
      const iv = setInterval(() => {
        const t = MOCK_POOL[Math.floor(Math.random() * MOCK_POOL.length)];
        emit({ type: t, payload: tickPayload(t), at: new Date().toISOString() });
      }, 10000);
      return () => { clearInterval(iv); setConnected(false); setSource('off'); };
    }

    let ws: WebSocket | null = null;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const connect = () => {
      try {
        ws = new WebSocket(WS_BASE_URL);
      } catch { schedule(); return; }
      ws.onopen = () => { setConnected(true); setSource('socket'); retries = 0; ws?.send(JSON.stringify({ subscribe: channels })); };
      ws.onmessage = (msg) => {
        try {
          const e = JSON.parse(msg.data) as WsEvent;
          emit(e);
        } catch { /* ignore malformed */ }
      };
      ws.onclose = () => { setConnected(false); schedule(); };
      ws.onerror = () => ws?.close();
    };
    const schedule = () => {
      if (retries++ > 5) return;
      timer = setTimeout(connect, 5000);
    };
    connect();
    return () => { clearTimeout(timer); ws?.close(); setConnected(false); setSource('off'); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, channels.join(',')]);

  return { connected, source, lastEvent, subscribe };
}

function tickPayload(t: string): unknown {
  switch (t) {
    case 'activity': return { text: 'Ananya updated BOQ item 4.2.3 rate' };
    case 'conflict': return { count: 23, critical: 4 };
    case 'risk': return { open: 5, top: 'R-07' };
    default: return { status: 'ready' };
  }
}
