import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { Msg, Project, TSystemImpact } from "@buzzzz/core";
import { useRelay } from "../connection/useRelay";
import { usePhoneLibrary } from "../connection/usePhoneLibrary";
import { useUploadedRive } from "./useUploadedRive";
import { useRive } from "./useRive";
import { useRiveHaptics } from "./useRiveHaptics";

interface IRiveSession {
  project: Project;
  projectId: string;
  active: boolean;
  mapped: Record<string, Project["presets"][number]["pattern"]>;
  onTrigger: (pattern: Project["presets"][number]["pattern"]) => void;
  onSystemImpact: (preset: TSystemImpact) => void;
  onSystemStop: () => void;
  systemPreviewEnabled: () => boolean;
  addLog: (message: string) => void;
  onError: (message: string) => void;
  onStateMachineChange: (name: string | undefined) => void;
}
export function useRiveSession(props: IRiveSession) {
  const {
    project,
    projectId,
    active,
    mapped,
    onTrigger,
    onSystemImpact,
    onSystemStop,
    systemPreviewEnabled,
    addLog,
    onError,
    onStateMachineChange: setStateMachine,
  } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const triggerRows = useRef(new Map<string, HTMLDivElement>());
  type RiveAsset = { name: string; buffer: ArrayBuffer } | null;
  const [asset, setAsset] = useState<{ projectId: string; riv: RiveAsset } | null>(null);
  const setRiv = useCallback((riv: RiveAsset) => setAsset({ projectId, riv }), [projectId]);
  const riv = asset?.projectId === projectId ? asset.riv : null;
  const haptics = useRiveHaptics({
    config: project.riveConfig,
    onImpact: onSystemImpact,
    enabled: systemPreviewEnabled,
    fireTrigger: (name) => rive.fire(name),
    onComplete: () => rive.finish(),
  });
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
  const rive = useRive({
    canvas,
    buffer: riv?.buffer ?? null,
    requestedStateMachine,
    config: project.riveConfig,
    active,
    onStop: () => {
      haptics.stop();
      onSystemStop();
    },
    onFinish: onSystemStop,
    onPause: (paused) => {
      if (paused) {
        haptics.pause();
        onSystemStop();
      } else haptics.resume();
    },
    onFired: (name) => {
      if (!active || rive.paused || document.visibilityState !== "visible") return;
      addLog(`Studio fired ${name}`);
      flash(name);
      if (haptics.fire(name)) return;
      const preset = project.presets.find((item) => item.id === project.map[name]);
      if (preset) onTrigger(preset.pattern);
    },
    onError,
  });
  const publishLoad = useEffectEvent((path: string) =>
    relay.send({
      type: "load",
      riv: path,
      stateMachine: rive.stateMachine,
      riveConfig: project.riveConfig,
      map: mapped,
    }),
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
  }, [path, rive.stateMachine, rive.ready, hasPhones, joinVersion, project.riveConfig]);
  useEffect(() => {
    send({ type: "map", map: mapped });
  }, [mapped, send]);
  return { ...rive, ...relay, canvas, triggerRows, riv, setRiv, setStateMachine };
}
