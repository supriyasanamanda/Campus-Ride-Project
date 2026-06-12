import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export const useSocket = (onEvents = {}) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Reuse existing socket connection
    if (!socketInstance) {
      socketInstance = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
      });
    }
    socketRef.current = socketInstance;

    // Register event listeners
    Object.entries(onEvents).forEach(([event, handler]) => {
      socketRef.current.on(event, handler);
    });

    return () => {
      Object.keys(onEvents).forEach((event) => {
        socketRef.current?.off(event);
      });
    };
  }, []);

  const emit = (event, data) => socketRef.current?.emit(event, data);

  return { socket: socketRef.current, emit };
};

export const disconnectSocket = () => {
  socketInstance?.disconnect();
  socketInstance = null;
};
