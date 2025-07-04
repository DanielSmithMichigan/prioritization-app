import React, { createContext, useRef, useEffect, useState, type RefObject } from 'react';

interface WebSocketContextType {
  socket: RefObject<WebSocket | null>;
  ready: boolean;
}

export const WebSocketContext = createContext<WebSocketContextType>({ socket: { current: null }, ready: false });

export const SessionWebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`wss://tl81jg4u5a.execute-api.us-east-1.amazonaws.com/Prod`);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setReady(true);
    };
    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setReady(false);
    };
    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    return () => ws.close();
  }, []);

  return (
    <WebSocketContext.Provider value={{ socket: socketRef, ready }}>
      {children}
    </WebSocketContext.Provider>
  );
};

