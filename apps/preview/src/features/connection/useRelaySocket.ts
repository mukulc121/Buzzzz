import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { parseMessage, type Msg } from "@buzzzz/core";
import { phoneRelayUrl, type IPhoneConnection } from "./pairing";
import { reconnectDelay, socketFailure } from "./socketFailure";

export type RelayStatus = "idle" | "connecting" | "connected" | "error";

export function useRelaySocket(onMessage: (message: Msg, relay: string) => void) {
  const [status, setStatus] = useState<RelayStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const callback = useRef(onMessage);
  useLayoutEffect(() => {
    callback.current = onMessage;
  }, [onMessage]);
  const disconnect = useCallback(() => {
    clearTimeout(retry.current);
    clearTimeout(timeout.current);
    const previous = socket.current;
    socket.current = null;
    previous?.close();
    setStatus("idle");
    setError(null);
  }, []);
  const connect = useCallback(
    (connection: IPhoneConnection) => {
      disconnect();
      let opened = false;
      let attempt = 0;
      const url = phoneRelayUrl(connection.url);
      function openRelay() {
        if (connection.expiresAt && connection.expiresAt <= Date.now()) {
          setStatus("error");
          setError("This Studio session expired. Pair again with a new link.");
          return;
        }
        setStatus("connecting");
        const client = new WebSocket(url.href);
        socket.current = client;
        timeout.current = setTimeout(() => client.close(), 8000);
        client.onopen = () => {
          if (socket.current !== client) return;
          clearTimeout(timeout.current);
          opened = true;
          attempt = 0;
          setStatus("connected");
          client.send(
            JSON.stringify({ type: "hello", device: `${Platform.OS} ${Platform.Version}` }),
          );
        };
        client.onmessage = (event) => {
          if (socket.current !== client || typeof event.data !== "string") return;
          const message = parseMessage(event.data);
          if (message) callback.current(message, url.href);
        };
        client.onerror = () => client.close();
        client.onclose = (event) => {
          if (socket.current !== client) return;
          clearTimeout(timeout.current);
          const failure = socketFailure({ code: event.code, opened });
          if (failure) {
            setStatus("error");
            setError(failure);
          } else {
            setStatus("connecting");
            retry.current = setTimeout(() => {
              if (socket.current === client) openRelay();
            }, reconnectDelay(attempt++));
          }
        };
      }
      openRelay();
    },
    [disconnect],
  );
  useEffect(() => disconnect, [disconnect]);
  const send = (message: Msg) => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(message));
  };
  return { status, error, connect, disconnect, send };
}
