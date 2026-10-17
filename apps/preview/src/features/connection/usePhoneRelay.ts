import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert, AppState, Linking, Platform } from "react-native";
import { fromDeepLink, pairingLink, type Msg } from "@buzzzz/core";
import { connectionTarget } from "./connectionTarget";
import { needsConnectionConsent } from "./connectionInput";
import { resolvePhoneConnection } from "./pairing";
import { createConnectionStorage } from "./storage";
import { connectionDisplayName } from "./model";
import { useRelaySocket, type RelayStatus } from "./useRelaySocket";

export function usePhoneRelay(
  onMessage: (message: Msg, relay: string, connectionId: string) => void,
  onConnectionChange: (connectionId: string | null) => void,
  onConnectionRemoved?: (connectionId: string) => void,
) {
  const callbacks = useRef({ onConnectionChange, onConnectionRemoved });
  useLayoutEffect(() => {
    callbacks.current = { onConnectionChange, onConnectionRemoved };
  }, [onConnectionChange, onConnectionRemoved]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storage] = useState(createConnectionStorage);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const trusted = useRef(new Set<string>());
  const relay = useRelaySocket(onMessage);
  const {
    connect: connectSocket,
    rename: renameSocket,
    disconnect: disconnectSocket,
    restore,
    snapshot,
    reconnectInterrupted,
  } = relay;
  useEffect(() => {
    mounted.current = true;
    let active = true;
    void storage.load().then(
      (connections) => {
        if (!active) return;
        for (const connection of connections) trusted.current.add(new URL(connection.url).origin);
        restore(connections);
      },
      () => {
        if (active) setError("Saved connections could not be restored.");
      },
    );
    return () => {
      active = false;
      mounted.current = false;
      request.current?.abort();
      request.current = null;
    };
  }, [storage, restore]);
  const rename = useCallback(
    async (id: string, name: string) => {
      const record = await storage.rename(id, name);
      if (!mounted.current || !record) return false;
      return renameSocket(id, name);
    },
    [storage, renameSocket],
  );
  const disconnect = useCallback(
    async (id?: string) => {
      const target = id ?? snapshot().currentConnectionId;
      if (!id) {
        request.current?.abort();
        request.current = null;
        setPending(false);
      }
      if (target) {
        await storage.remove(target);
        if (!mounted.current) return;
        disconnectSocket(target);
        callbacks.current.onConnectionRemoved?.(target);
      }
      setError(null);
    },
    [storage, disconnectSocket, snapshot],
  );
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
        .then(async (connection) => {
          if (request.current !== controller) return;
          const record = await storage.add(connection);
          if (!mounted.current || request.current !== controller) return;
          callbacks.current.onConnectionChange(record.id);
          setInput("");
          setPending(false);
          connectSocket(record);
        })
        .catch((cause: unknown) => {
          if (!mounted.current || request.current !== controller) return;
          setPending(false);
          setError(
            cause instanceof Error && cause.name !== "AbortError"
              ? cause.message
              : "Pairing timed out. Check your network and try again.",
          );
        })
        .finally(() => {
          clearTimeout(timer);
          if (request.current === controller) request.current = null;
        });
    },
    [connectSocket, storage],
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
      if (!needsConnectionConsent(value, target, trusted.current)) {
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
    };
  }, [requestConnection]);
  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener("change", (next) => {
      if ((previous === "inactive" || previous === "background") && next === "active")
        reconnectInterrupted();
      previous = next;
    });
    return () => subscription.remove();
  }, [reconnectInterrupted]);
  const current = relay.connections.find(
    (connection) => connection.id === relay.currentConnectionId,
  );
  const status: RelayStatus = pending ? "connecting" : error ? "error" : relay.status;
  return {
    input,
    setInput,
    host: current ? connectionDisplayName(current) : "",
    status,
    error: error ?? relay.error,
    connections: relay.connections,
    currentConnectionId: relay.currentConnectionId,
    setCurrentConnectionId: (id: string) => {
      if (relay.setCurrentConnectionId(id)) {
        setError(null);
        callbacks.current.onConnectionChange(id);
      }
    },
    connect,
    requestConnection,
    disconnect,
    rename,
    send: relay.send,
    reconnect: (id?: string) => {
      setError(null);
      relay.reconnect(id);
    },
  };
}
