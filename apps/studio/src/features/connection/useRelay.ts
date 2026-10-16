import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { parseMessage, type Msg } from "@buzzzz/core";
export function useRelay(onMsg: (message: Msg) => void) {
  const ws = useRef<WebSocket | null>(null);
  const [phones, setPhones] = useState(0);
  const [joinVersion, setJoinVersion] = useState(0);
  const previousPhones = useRef(0);
  const [connected, setConnected] = useState(false);
  const onMessage = useEffectEvent(onMsg);
  useEffect(() => {
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      if (closed) return;
      const socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/relay?role=studio`,
      );
      socket.onopen = () => setConnected(true);
      socket.onmessage = (event) => {
        if (closed || ws.current !== socket || typeof event.data !== "string") return;
        const message = parseMessage(event.data);
        if (!message) return;
        if (message.type === "peers") {
          if (message.phones > previousPhones.current) setJoinVersion((version) => version + 1);
          previousPhones.current = message.phones;
          setPhones(message.phones);
        }
        onMessage(message);
      };
      socket.onerror = () => socket.close();
      socket.onclose = () => {
        if (closed) return;
        previousPhones.current = 0;
        setPhones(0);
        setConnected(false);
        retry = setTimeout(connect, 1000);
      };
      ws.current = socket;
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      ws.current?.close();
    };
  }, []);
  const send = useCallback((message: Msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(message));
  }, []);
  return { phones, connected, joinVersion, send };
}
