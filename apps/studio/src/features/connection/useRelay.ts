import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { parseMessage, type Msg } from "@buzzzz/core";
import { cloudOrigin, createRoom, type IRoom } from "./cloud";
import { readHostSession, storeHostSession } from "./hostSession";
import { claimRoom } from "./roomLock";

export function useRelay(onMsg: (message: Msg) => void) {
  const ws = useRef<WebSocket | null>(null);
  const [phones, setPhones] = useState(0);
  const [joinVersion, setJoinVersion] = useState(0);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<IRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const listeners = useRef(new Set<(message: Msg) => void>());
  const onMessage = useEffectEvent(onMsg);
  useEffect(() => {
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;
    const origin = cloudOrigin();
    let currentRoom: IRoom | null = null;
    let releaseRoom: (() => void) | null = null;
    let previousPhones = 0;
    let failures = 0;
    async function connect() {
      if (controller.signal.aborted) return;
      try {
        if (origin && !currentRoom) {
          const stored = readHostSession(origin);
          if (stored) {
            releaseRoom = await claimRoom(stored.roomId, controller.signal, 1000);
            if (releaseRoom) currentRoom = stored;
          }
        }
        if (origin && (!currentRoom || currentRoom.expiresAt <= Date.now())) {
          releaseRoom?.();
          releaseRoom = null;
          currentRoom = await createRoom(origin, controller.signal);
          releaseRoom = await claimRoom(currentRoom.roomId, controller.signal);
          if (navigator.locks && !releaseRoom) {
            currentRoom = null;
            throw new Error("Could not claim the pairing room");
          }
          storeHostSession(origin, currentRoom);
        }
        if (controller.signal.aborted) return;
        setRoom(currentRoom);
        const socket = new WebSocket(
          currentRoom?.relayUrl ??
            `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/relay?role=studio`,
        );
        ws.current = socket;
        let opened = false;
        socket.onopen = () => {
          opened = true;
          failures = 0;
          setConnected(true);
          setError(null);
        };
        socket.onmessage = (event) => {
          if (controller.signal.aborted || ws.current !== socket || typeof event.data !== "string")
            return;
          const message = parseMessage(event.data);
          if (!message) return;
          if (message.type === "peers") {
            if (message.phones > previousPhones) setJoinVersion((version) => version + 1);
            previousPhones = message.phones;
            setPhones(message.phones);
          }
          onMessage(message);
          for (const listener of listeners.current) listener(message);
        };
        socket.onerror = () => socket.close();
        socket.onclose = async (event) => {
          if (controller.signal.aborted || ws.current !== socket) return;
          previousPhones = 0;
          setPhones(0);
          setConnected(false);
          let expired = event.code === 4401 || (currentRoom?.expiresAt ?? Infinity) <= Date.now();
          if (currentRoom && !opened && !expired) {
            try {
              const origin = cloudOrigin();
              if (origin) {
                const response = await fetch(`${origin}/v1/rooms/${currentRoom.roomId}/project`, {
                  headers: { Authorization: `Bearer ${currentRoom.hostToken}` },
                  signal: controller.signal,
                });
                expired = response.status === 401 || response.status === 410;
              }
            } catch {
              if (controller.signal.aborted) return;
            }
          }
          if (controller.signal.aborted) return;
          if (currentRoom && expired) {
            releaseRoom?.();
            releaseRoom = null;
            currentRoom = null;
            if (origin) storeHostSession(origin, null);
            setRoom(null);
            setError("Pairing room ended. Creating a new room…");
          } else setError("Connection lost. Reconnecting…");
          retry = setTimeout(
            () => void connect(),
            Math.min(30_000, 1500 * 2 ** Math.min(failures++, 5)),
          );
        };
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!releaseRoom) currentRoom = null;
        setError(error instanceof Error ? error.message : "Could not connect");
        retry = setTimeout(() => void connect(), 3000);
      }
    }
    void connect();
    return () => {
      controller.abort();
      clearTimeout(retry);
      ws.current?.close();
      releaseRoom?.();
    };
  }, []);
  const send = useCallback((message: Msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(message));
  }, []);
  const subscribe = useCallback((listener: (message: Msg) => void) => {
    listeners.current.add(listener);
    return () => void listeners.current.delete(listener);
  }, []);
  return { phones, connected, joinVersion, send, subscribe, room, error };
}
