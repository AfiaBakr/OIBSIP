import { useEffect, useLayoutEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_URL, loadAuth } from './api';

/**
 * Opens an authenticated Socket.IO connection for as long as the component is mounted.
 * `kind` picks which session to authenticate with ('user' or 'admin'). `handlers` maps event
 * names to callbacks; `onReconnect` runs after a dropped connection comes back, so the page can
 * refetch anything it missed while offline.
 */
export function useSocket(kind, handlers, onReconnect) {
  const handlersRef = useRef(handlers);
  const reconnectRef = useRef(onReconnect);
  useLayoutEffect(() => {
    handlersRef.current = handlers;
    reconnectRef.current = onReconnect;
  });

  useEffect(() => {
    const token = loadAuth(kind)?.token;
    if (!token) return undefined;

    const socket = io(API_URL || undefined, { auth: { token } });
    let connectedBefore = false;

    socket.on('connect', () => {
      if (connectedBefore) reconnectRef.current?.();
      connectedBefore = true;
    });
    for (const event of Object.keys(handlersRef.current)) {
      socket.on(event, (payload) => handlersRef.current[event]?.(payload));
    }
    return () => socket.disconnect();
  }, [kind]);
}
