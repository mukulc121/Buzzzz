import { useEffect, useLayoutEffect, useState } from "react";
import { Platform } from "react-native";
import type { Msg } from "@buzzzz/core";
import { createRelayConnections, type IRelaySnapshot } from "./relayConnections";

export type { RelayStatus } from "./model";

export function useRelaySocket(
  onMessage: (message: Msg, relay: string, connectionId: string) => void,
) {
  const [state, setState] = useState<IRelaySnapshot>({
    connections: [],
    currentConnectionId: null,
  });
  const [relay] = useState(() =>
    createRelayConnections({
      device: `${Platform.OS} ${Platform.Version}`,
      onChange: setState,
      onMessage,
    }),
  );
  useLayoutEffect(() => relay.setOnMessage(onMessage), [relay, onMessage]);
  useEffect(() => () => relay.dispose(), [relay]);
  const current = state.connections.find(
    (connection) => connection.id === state.currentConnectionId,
  );
  return {
    ...state,
    status: current?.status ?? "idle",
    error: current?.error ?? null,
    connect: relay.connect,
    rename: relay.rename,
    disconnect: relay.remove,
    setCurrentConnectionId: relay.select,
    restore: relay.restore,
    send: relay.send,
    reconnect: relay.reconnect,
    reconnectInterrupted: relay.reconnectInterrupted,
    snapshot: relay.snapshot,
  };
}
