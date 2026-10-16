import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Msg, Project } from "@buzzzz/core";
import { useRelay } from "../connection/useRelay";
import { usePhoneLibrary } from "../connection/usePhoneLibrary";
import { useUploadedRive } from "./useUploadedRive";
import { useRive } from "./useRive";

interface IRiveSession {
  project: Project;
  mapped: Record<string, Project["presets"][number]["pattern"]>;
  onTrigger: (pattern: Project["presets"][number]["pattern"]) => void;
  addLog: (message: string) => void;
  onError: (message: string) => void;
  onStateMachineChange: (name: string | undefined) => void;
}
export function useRiveSession(props: IRiveSession) {
  const {
    project,
    mapped,
    onTrigger,
    addLog,
    onError,
    onStateMachineChange: setStateMachine,
  } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const triggerRows = useRef(new Map<string, HTMLDivElement>());
  const [riv, setRiv] = useState<{ name: string; buffer: ArrayBuffer } | null>(null);
  const requestedStateMachine = project.riveStateMachine;
  const flash = (name: string) => {
    const row = triggerRows.current.get(name);
    if (!row) return;
    row.classList.remove("fired");
    void row.offsetWidth;
    row.classList.add("fired");
  };
  const relay = useRelay((message: Msg) => {
    if (message.type === "hello") addLog(`Phone joined · ${message.device}`);
    if (message.type === "fired") {
      addLog(`Phone fired ${message.name}`);
      flash(message.name);
    }
  });
  const rive = useRive(
    canvas,
    riv?.buffer ?? null,
    requestedStateMachine,
    (name) => {
      addLog(`Studio fired ${name}`);
      flash(name);
      const preset = project.presets.find((item) => item.id === project.map[name]);
      if (preset) onTrigger(preset.pattern);
    },
    onError,
  );
  const publishLoad = useEffectEvent((path: string) =>
    relay.send({ type: "load", riv: path, stateMachine: rive.stateMachine, map: mapped }),
  );
  const hasPhones = relay.phones > 0;
  const { room, joinVersion, send } = relay;
  usePhoneLibrary({
    presets: project.presets,
    connected: relay.connected,
    joinVersion,
    send,
    subscribe: relay.subscribe,
  });
  const path = useUploadedRive({
    buffer: riv?.buffer ?? null,
    room,
    enabled: hasPhones && rive.ready,
    onError,
  });
  useEffect(() => {
    if (hasPhones && path && rive.ready) publishLoad(path);
  }, [path, rive.stateMachine, rive.ready, hasPhones, joinVersion]);
  useEffect(() => {
    send({ type: "map", map: mapped });
  }, [mapped, send]);
  return { ...rive, ...relay, canvas, triggerRows, riv, setRiv, setStateMachine };
}
