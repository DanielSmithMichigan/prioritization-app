import React, { createContext, useRef, useEffect, useState, type RefObject } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

interface WebSocketContextType {
  socket: RefObject<WebSocket | null>;
  ready: boolean;
}

export const WebSocketContext = createContext<WebSocketContextType>({ socket: { current: null }, ready: false });

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export const SessionWebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const connect = async () => {
      setConnectionStatus('connecting');
      const token = await getAccessTokenSilently();
      const ws = new WebSocket(`wss://tl81jg4u5a.execute-api.us-east-1.amazonaws.com/Prod?token=${token}`);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setConnectionStatus('connected');
      };
      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setConnectionStatus('disconnected');
      };
      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setConnectionStatus('disconnected');
      };
    }

    connect();

    return () => socketRef.current?.close();
  }, [getAccessTokenSilently]);

  const indicatorColor = {
    connecting: 'yellow',
    connected: 'green',
    disconnected: 'red',
  };

  return (
    <WebSocketContext.Provider value={{ socket: socketRef, ready: connectionStatus === 'connected' }}>
      {children}
      <div
        title={`WebSocket: ${connectionStatus}`}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          border: '1px solid #ccc',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          zIndex: 10000,
          boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            width: '15px',
            height: '15px',
            borderRadius: '50%',
            backgroundColor: indicatorColor[connectionStatus],
            marginRight: '10px',
          }}
        />
        <span style={{ textTransform: 'capitalize' }}>{connectionStatus}</span>
      </div>
    </WebSocketContext.Provider>
  );
};

