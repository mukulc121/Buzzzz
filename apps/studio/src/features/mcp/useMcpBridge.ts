import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { editorResult, type EditorCommand, type Msg } from "@buzzzz/core";
import { cloudOrigin, type IRoom } from "../connection/cloud";
import { fetchRoomAsset, roomAssetUrl } from "./asset";
import { dispatchCommand } from "./dispatch";
import type { IEditorTarget } from "./target";

interface IMcpBridge extends IEditorTarget {
  room: IRoom | null;
  connected: boolean;
  subscribe: (listener: (message: Msg) => void) => () => void;
  send: (message: Msg) => void;
}
interface IActivity {
  command: EditorCommand;
  ok: boolean;
  message: string | null;
  at: number;
}

// The relay gives up after 30 s; finish first so the reply is still accepted.
const COMMAND_BUDGET_MS = 25_000;
const COMMIT_WAIT_MS = 500;

function failure(error: unknown): string {
  if (!(error instanceof Error)) return "Editor command failed";
  return ["AbortError", "TimeoutError"].includes(error.name)
    ? "The command was cancelled or ran out of time"
    : error.message;
}

export function useMcpBridge(props: IMcpBridge) {
  const { room, connected, subscribe, send, ...target } = props;
  const latest = useRef({ target, send });
  const waiters = useRef<(() => void)[]>([]);
  useLayoutEffect(() => {
    latest.current = { target, send };
    for (const resolve of waiters.current.splice(0)) resolve();
  });
  const [activity, setActivity] = useState<IActivity[]>([]);
  const [busy, setBusy] = useState(false);
  const roomId = room?.roomId ?? null;

  useEffect(() => {
    const origin = cloudOrigin();
    if (!origin || !roomId || !connected) return;
    const closed = new AbortController();
    let queue = Promise.resolve();
    // Lets React render the last command's state changes before the next command reads them.
    const nextCommit = () =>
      new Promise<void>((resolve) => {
        waiters.current.push(resolve);
        setTimeout(resolve, COMMIT_WAIT_MS);
      });
    const execute = async (
      requestId: string,
      command: EditorCommand,
      args: Record<string, unknown>,
      receivedAt: number,
    ) => {
      if (closed.signal.aborted) return;
      const remaining = COMMAND_BUDGET_MS - (performance.now() - receivedAt);
      const signal = AbortSignal.any([
        closed.signal,
        AbortSignal.timeout(Math.max(0, Math.floor(remaining))),
      ]);
      setBusy(true);
      let outcome: { result: unknown } | { error: string };
      try {
        if (remaining <= 0) throw new DOMException("Command expired in the queue", "TimeoutError");
        const result = await dispatchCommand(command, args, {
          read: () => latest.current.target,
          signal,
          loadAsset: (input) =>
            fetchRoomAsset({ ...input, url: roomAssetUrl(input.url, origin, roomId).href }),
        });
        outcome = { result };
      } catch (error) {
        outcome = { error: failure(error) };
      }
      const committed = nextCommit();
      setBusy(false);
      await committed;
      if (closed.signal.aborted) return;
      latest.current.send(editorResult(requestId, outcome));
      const message = "error" in outcome ? outcome.error : null;
      setActivity((items) =>
        [{ command, ok: message === null, message, at: Date.now() }, ...items].slice(0, 5),
      );
    };
    const unsubscribe = subscribe((message) => {
      if (message.type !== "editor-command") return;
      const { requestId, command, args } = message;
      const receivedAt = performance.now();
      queue = queue.then(() => execute(requestId, command, args, receivedAt));
    });
    return () => {
      unsubscribe();
      closed.abort();
      setBusy(false);
    };
  }, [roomId, subscribe, connected]);

  return {
    available: Boolean(cloudOrigin() && room && connected),
    readOnly: !target.document.isWriter,
    busy,
    activity,
  };
}
export type McpBridge = ReturnType<typeof useMcpBridge>;
