import { parseMessage, type Msg } from "@buzzzz/core";
import type { IRelayConnection, IStoredConnection } from "./model";
import { phoneRelayUrl } from "./pairing";
import { openRelayTransport, type IRelayTransport } from "./relayTransport";
import { reconnectDelay, socketFailure } from "./socketFailure";

interface IRelayClock {
  now: () => number;
  after: (delay: number, callback: () => void) => () => void;
  every: (delay: number, callback: () => void) => () => void;
}

interface IRelayClient {
  connection: IStoredConnection;
  device: string;
  onMessage: (message: Msg, relay: string, connectionId: string) => void;
  onChange: (state: Pick<IRelayConnection, "status" | "error">) => void;
  openSocket?: typeof openRelayTransport;
  clock?: IRelayClock;
}

const nativeClock: IRelayClock = {
  now: Date.now,
  after: (delay, callback) => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  },
  every: (delay, callback) => {
    const timer = setInterval(callback, delay);
    return () => clearInterval(timer);
  },
};

export function createRelayClient(props: IRelayClient) {
  const { connection, device, onMessage, onChange } = props;
  const clock = props.clock ?? nativeClock;
  const openSocket = props.openSocket ?? openRelayTransport;
  const url = phoneRelayUrl(connection.url);
  let current: IRelayTransport | null = null;
  let active = false;
  let opened = false;
  let attempt = 0;
  let cancelRetry = () => {};
  let cancelHandshake = () => {};
  let cancelPing = () => {};
  const clearTimers = () => {
    cancelRetry();
    cancelHandshake();
    cancelPing();
  };
  const dispose = () => {
    active = false;
    clearTimers();
    const previous = current;
    current = null;
    previous?.close();
  };
  const open = () => {
    if (!active) return;
    if (connection.expiresAt && connection.expiresAt <= clock.now()) {
      onChange({
        status: "error",
        error: "This Studio session expired. Pair again with a new link.",
      });
      return;
    }
    onChange({ status: "connecting", error: null });
    let client: IRelayTransport;
    const isCurrent = () => active && current === client;
    const closed = (code: number) => {
      if (!isCurrent()) return;
      cancelHandshake();
      cancelPing();
      current = null;
      client.close();
      const failure = socketFailure({ code, opened });
      if (failure) onChange({ status: "error", error: failure });
      else {
        onChange({ status: "connecting", error: null });
        cancelRetry = clock.after(reconnectDelay(attempt++), open);
      }
    };
    try {
      client = openSocket(url.href, {
        onOpen: () => {
          if (!isCurrent()) return;
          cancelHandshake();
          opened = true;
          attempt = 0;
          onChange({ status: "connected", error: null });
          try {
            client.send(JSON.stringify({ type: "hello", device }));
            client.send(JSON.stringify({ type: "library-manifest-request" }));
          } catch {
            closed(1006);
            return;
          }
          if (url.searchParams.has("token"))
            cancelPing = clock.every(25000, () => {
              if (!isCurrent() || !client.isOpen()) return;
              if (connection.expiresAt && connection.expiresAt <= clock.now()) {
                closed(4401);
                return;
              }
              try {
                client.send("ping");
              } catch {
                closed(1006);
              }
            });
        },
        onMessage: (data) => {
          if (!isCurrent() || typeof data !== "string" || data === "pong") return;
          const message = parseMessage(data);
          if (message) onMessage(message, url.href, connection.id);
        },
        onClose: closed,
        onError: () => closed(1006),
      });
      current = client;
      cancelHandshake = clock.after(15000, () => closed(1006));
    } catch {
      onChange({
        status: "error",
        error: "Couldn’t reach Studio. Check the address and your network.",
      });
    }
  };
  return {
    connect: () => {
      dispose();
      active = true;
      attempt = 0;
      open();
    },
    dispose,
    send: (message: Msg) => {
      if (!current?.isOpen()) return false;
      try {
        current.send(JSON.stringify(message));
        return true;
      } catch {
        return false;
      }
    },
  };
}
