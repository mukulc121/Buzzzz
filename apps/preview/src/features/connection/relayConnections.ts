import type { Msg } from "@buzzzz/core";
import { createRelayClient } from "./relayClient";
import type { IRelayConnection, IStoredConnection } from "./model";

export interface IRelaySnapshot {
  connections: IRelayConnection[];
  currentConnectionId: string | null;
}

interface IRelayConnections {
  device: string;
  onMessage: (message: Msg, relay: string, connectionId: string) => void;
  onChange: (snapshot: IRelaySnapshot) => void;
  createClient?: typeof createRelayClient;
}

export function createRelayConnections(props: IRelayConnections) {
  const createClient = props.createClient ?? createRelayClient;
  let onMessage = props.onMessage;
  const records = new Map<string, IRelayConnection>();
  const clients = new Map<string, ReturnType<typeof createRelayClient>>();
  let selected: string | null = null;
  const snapshot = (): IRelaySnapshot => ({
    connections: [...records.values()],
    currentConnectionId: selected,
  });
  const emit = () => props.onChange(snapshot());
  const attach = (record: IStoredConnection) => {
    clients.get(record.id)?.dispose();
    records.set(record.id, { ...record, status: "connecting", error: null });
    const client = createClient({
      connection: record,
      device: props.device,
      onMessage: (message, relay, id) => {
        if (clients.get(id) !== client) return;
        onMessage(message, relay, id);
      },
      onChange: (state) => {
        const previous = records.get(record.id);
        if (!previous || clients.get(record.id) !== client) return;
        records.set(record.id, { ...previous, ...state });
        emit();
      },
    });
    clients.set(record.id, client);
    client.connect();
  };
  return {
    setOnMessage: (callback: IRelayConnections["onMessage"]) => {
      onMessage = callback;
    },
    snapshot,
    restore: (connections: readonly IStoredConnection[]) => {
      for (const record of connections) {
        if (!clients.has(record.id)) attach(record);
      }
      if (!selected) selected = connections[0]?.id ?? null;
      emit();
    },
    connect: (connection: IStoredConnection) => {
      selected = connection.id;
      attach(connection);
      emit();
    },
    select: (id: string) => {
      if (!records.has(id) || selected === id) return false;
      selected = id;
      emit();
      return true;
    },
    remove: (id: string) => {
      const client = clients.get(id);
      clients.delete(id);
      client?.dispose();
      records.delete(id);
      if (selected === id) selected = records.keys().next().value ?? null;
      emit();
    },
    reconnect: (id?: string) => {
      const target = id ?? selected;
      if (target) clients.get(target)?.connect();
    },
    reconnectInterrupted: () => {
      for (const [id, record] of records) {
        if (record.status !== "connected") clients.get(id)?.connect();
      }
    },
    send: (message: Msg, id?: string) => {
      const target = id ?? selected;
      return target ? (clients.get(target)?.send(message) ?? false) : false;
    },
    dispose: () => {
      const previous = [...clients.values()];
      clients.clear();
      for (const client of previous) client.dispose();
    },
  };
}
