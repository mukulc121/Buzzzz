import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { resolveRivePresetId } from "@buzzzz/core";
import type { IRiveConfig, Msg, Project, TRiveCue, TSystemImpact } from "@buzzzz/core";
import { useRelay } from "../connection/useRelay";
import { usePhoneLibrary } from "../connection/usePhoneLibrary";
import { useUploadedRive } from "./useUploadedRive";
import { useRive } from "./useRive";
import { useRiveHaptics } from "./useRiveHaptics";
import { normalizeDexConfig } from "../project/starter/rive/normalizeDexConfig";
import { useKnownRiveAsset } from "./useKnownRiveAsset";

interface IRiveSession {
  project: Project;
  projectId: string;
  active: boolean;
  writable: boolean;
  mapped: Record<string, Project["presets"][number]["pattern"]>;
  onTrigger: (pattern: Project["presets"][number]["pattern"]) => void;
  onSystemImpact: (cue: TSystemImpact | TRiveCue) => void;
  onSystemStop: () => void;
  systemPreviewEnabled: () => boolean;
  addLog: (message: string) => void;
  onError: (message: string) => void;
  onStateMachineChange: (name: string | undefined) => void;
  onConfigResolved: (
    config: IRiveConfig,
    target: { projectId: string; ownerId: string },
  ) => boolean;
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
  const projectRiv = asset?.projectId === projectId ? asset.riv : null;
  const owner = resolveRivePresetId(project);
  const recognized = useKnownRiveAsset({
    buffer: projectRiv?.buffer ?? null,
    projectId,
    ownerId: owner,
    config: project.riveConfig,
    hasCustomMap: Object.keys(project.map).length > 0,
    active,
    writable: props.writable,
    onConfigResolved: props.onConfigResolved,
    onError,
  });
  const riv = active && recognized ? projectRiv : null;
  const config = useMemo(
    () => normalizeDexConfig(project.riveConfig, owner),
    [project.riveConfig, owner],
  );
  const haptics = useRiveHaptics({
    config,
    onImpact: onSystemImpact,
    onStopPattern: onSystemStop,
    enabled: systemPreviewEnabled,
    fireTrigger: (name) => rive.fire(name),
    onComplete: () => rive.finish(),
    onSuspend: () => {
      if (!active || !rive.acceptsTriggers()) return;
      rive.suspend();
      relay.send({ type: "pause", paused: true });
    },
  });
  const { stop: stopHaptics } = haptics;
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
    config,
    active,
    onSceneMount: haptics.mount,
    onSceneBound: haptics.bind,
    onStop: () => {
      stopHaptics();
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
      if (!active || !rive.acceptsTriggers() || document.visibilityState !== "visible") return;
      addLog(`Studio fired ${name}`);
      flash(name);
      if (haptics.fire(name)) return;
      const preset = project.presets.find((item) => item.id === project.map[name]);
      if (preset) onTrigger(preset.pattern);
    },
    onError,
  });
  const published = useRef<{ key: string; buffer: ArrayBuffer } | null>(null);
  const publishLoad = useEffectEvent((path: string) => {
    if (!active || !riv || !rive.publishable) return;
    const key = JSON.stringify([projectId, path, rive.stateMachine, config, relay.joinVersion]);
    if (published.current?.key === key && published.current.buffer === riv.buffer) return;
    relay.send({
      type: "load",
      riv: path,
      stateMachine: rive.stateMachine,
      riveConfig: config,
      map: mapped,
    });
    published.current = { key, buffer: riv.buffer };
  });
  const hasPhones = relay.phones > 0;
  const { room, joinVersion, send } = relay;
  const previous = useRef(false);
  useLayoutEffect(() => {
    const present = active && projectRiv !== null;
    if (previous.current && !present) {
      stopHaptics();
      onSystemStop();
      send({ type: "pause", paused: true });
    }
    if (!present) published.current = null;
    previous.current = present;
  }, [active, projectRiv, stopHaptics, onSystemStop, send]);
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
    enabled: active && hasPhones && rive.ready && rive.publishable,
    onError,
  });
  useEffect(() => {
    if (active && hasPhones && path && rive.ready && rive.publishable) publishLoad(path);
  }, [
    active,
    path,
    rive.stateMachine,
    rive.ready,
    rive.publishable,
    hasPhones,
    joinVersion,
    config,
  ]);
  useEffect(() => {
    if (active) send({ type: "map", map: mapped });
  }, [active, mapped, send]);
  return {
    ...rive,
    ...relay,
    canvas,
    triggerRows,
    riv,
    projectRiv,
    setRiv,
    setStateMachine,
    elapsedMs: haptics.elapsedMs,
  };
}
