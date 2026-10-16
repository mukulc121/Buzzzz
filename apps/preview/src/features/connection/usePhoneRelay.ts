import { connectionTarget } from "./connectionTarget";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { fromDeepLink, pairingLink, type Msg } from "@buzzzz/core";
import { resolvePhoneConnection, type IPhoneConnection } from "./pairing";
import { useRelaySocket, type RelayStatus } from "./useRelaySocket";

export function usePhoneRelay(
  onMessage: (message: Msg, relay: string) => void,
  onConnectionChange: () => void,
) {
  const reset = useRef(onConnectionChange);
  useLayoutEffect(() => {
    reset.current = onConnectionChange;
  }, [onConnectionChange]);
  const [input, setInput] = useState("");
  const [host, setHost] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const lastConnection = useRef<IPhoneConnection | null>(null);
  const trusted = useRef(new Set<string>());
  const relay = useRelaySocket(onMessage);
  const { connect: connectSocket, disconnect: disconnectSocket } = relay;
  const disconnect = useCallback(() => {
    request.current?.abort();
    request.current = null;
    lastConnection.current = null;
    setHost("");
    disconnectSocket();
    setPending(false);
    setError(null);
  }, [disconnectSocket]);
  const connect = useCallback(
    (value: string) => {
      let target: URL;
      try {
        target = connectionTarget(value.trim());
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Invalid connection link.");
        return;
      }
      trusted.current.add(target.origin);
      request.current?.abort();
      setError(null);
      const controller = new AbortController();
      request.current = controller;
      setPending(true);
      const timer = setTimeout(() => controller.abort(), 8000);
      void resolvePhoneConnection({
        input: value.trim(),
        device: `${Platform.OS} ${Platform.Version}`,
        signal: controller.signal,
      })
        .then((connection) => {
          if (request.current !== controller) return;
          reset.current();
          lastConnection.current = connection;
          setHost(connection.label);
          setInput("");
          setPending(false);
          connectSocket(connection);
        })
        .catch((cause: unknown) => {
          if (request.current !== controller) return;
          setPending(false);
          setError(
            cause instanceof Error && cause.name !== "AbortError"
              ? cause.message
              : "Pairing timed out. Check your network and try again.",
          );
        })
        .finally(() => clearTimeout(timer));
    },
    [connectSocket],
  );
  const requestConnection = useCallback(
    (value: string) => {
      let target: URL;
      try {
        target = connectionTarget(value.trim());
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Invalid connection link.");
        return;
      }
      if (trusted.current.has(target.origin)) {
        connect(value);
        return;
      }
      Alert.alert(
        "Connect to Studio?",
        `Allow ${target.origin} to control animation and haptic playback on this phone?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Connect", onPress: () => connect(value) },
        ],
      );
    },
    [connect],
  );
  useEffect(() => {
    let active = true;
    const open = (url: string | null) => {
      if (active && url && (fromDeepLink(url) || pairingLink(url))) requestConnection(url);
    };
    void Linking.getInitialURL()
      .then(open)
      .catch(() => {});
    const subscription = Linking.addEventListener("url", ({ url }) => open(url));
    return () => {
      active = false;
      subscription.remove();
      disconnect();
    };
  }, [requestConnection, disconnect]);
  const reconnect = () => {
    if (lastConnection.current) {
      setError(null);
      connectSocket(lastConnection.current);
    }
  };
  const status: RelayStatus =
    relay.status === "connected"
      ? "connected"
      : pending
        ? "connecting"
        : error
          ? "error"
          : relay.status;
  return {
    input,
    setInput,
    host,
    status,
    error: error ?? relay.error,
    connect,
    requestConnection,
    disconnect,
    send: relay.send,
    reconnect,
  };
}
