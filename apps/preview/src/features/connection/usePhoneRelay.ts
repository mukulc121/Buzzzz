import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import { fromDeepLink, parseMessage, relayUrl, type Msg } from "@buzzzz/core";
type Status = "idle" | "connecting" | "connected" | "error";
export function usePhoneRelay(onMessage: (message: Msg, base: string) => void) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
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
  }, []);
  const connect = useCallback(
    function connectRelay(value: string) {
      disconnect();
      setInput(value.trim());
      const url = relayUrl(value);
      if (!url) {
        setStatus("error");
        return;
      }
      url.searchParams.set("role", "phone");
      const base = `${url.protocol === "wss:" ? "https:" : "http:"}//${url.host}`;
      setStatus("connecting");
      let opened = false;
      const client = new WebSocket(url.toString());
      socket.current = client;
      timeout.current = setTimeout(() => client.close(), 8000);
      client.onopen = () => {
        if (socket.current !== client) return;
        clearTimeout(timeout.current);
        opened = true;
        setStatus("connected");
        client.send(
          JSON.stringify({ type: "hello", device: `${Platform.OS} ${Platform.Version}` }),
        );
      };
      client.onmessage = (event) => {
        if (socket.current !== client || typeof event.data !== "string") return;
        const message = parseMessage(event.data);
        if (message) callback.current(message, base);
      };
      client.onerror = () => client.close();
      client.onclose = () => {
        if (socket.current !== client) return;
        clearTimeout(timeout.current);
        setStatus(opened ? "connecting" : "error");
        if (opened)
          retry.current = setTimeout(() => {
            if (socket.current === client) connectRelay(value);
          }, 1500);
      };
    },
    [disconnect],
  );
  useEffect(() => {
    let active = true;
    void Linking.getInitialURL()
      .then((value) => {
        const url = fromDeepLink(value);
        if (active && url) connect(url);
      })
      .catch(() => {});
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const value = fromDeepLink(url);
      if (value) connect(value);
    });
    return () => {
      active = false;
      subscription.remove();
      disconnect();
    };
  }, [connect, disconnect]);
  const send = (message: Msg) => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(message));
  };
  return { input, setInput, status, connect, disconnect, send };
}
