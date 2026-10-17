import { useCallback, useRef, useState } from "react";
import { Presets } from "react-native-pulsar";
import { resolveRiveUrl, type IRiveConfig, type Pattern } from "@buzzzz/core";
import { usePhoneRelay } from "../connection/usePhoneRelay";
import { useNativePlayback } from "../playback/useNativePlayback";
import { useRiveHaptics } from "../playback/useRiveHaptics";
import { useReceivedLibrary } from "../sessionLibrary/useReceivedLibrary";
import {
  isReceivedResourceMessage,
  stopLegacyFromBrowser,
} from "../sessionLibrary/browserCommands";
import { deriveTriggerRole } from "./triggerRole";
import type { ISceneOwner } from "../playback/sceneOwnership";

export function usePreviewSession() {
  const [riv, setRiv] = useState<{
    url: string;
    stateMachine?: string;
    riveConfig?: IRiveConfig;
  } | null>(null);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [mappedNames, setMappedNames] = useState<string[]>([]);
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const [event, setEvent] = useState<{ id: number; text: string } | null>(null);
  const [lastFired, setLastFired] = useState<{ name: string; id: number } | null>(null);
  const map = useRef<Record<string, Pattern>>({});
  const riveConfig = useRef<IRiveConfig | undefined>(undefined);
  const fireRef = useRef<(name: string) => void>(() => {});
  const pauseRef = useRef<(paused: boolean) => void>(() => {});
  const sceneOwner = useRef<ISceneOwner | null>(null);
  const sceneCompleted = useRef(false);
  const sceneInterrupted = useRef(false);
  const onRiveComplete = useCallback(() => {
    sceneCompleted.current = true;
    pauseRef.current(true);
    setPaused(true);
  }, []);
  const fireRiveTrigger = useCallback((name: string) => fireRef.current(name), []);
  const riveHaptics = useRiveHaptics({
    completion: riv?.riveConfig?.completion,
    haptics: riv?.riveConfig?.haptics,
    onComplete: onRiveComplete,
    fireTrigger: fireRiveTrigger,
  });
  const sceneConnection = useRef<string | null>(null);
  const legacyConnection = useRef<string | null>(null);
  const playback = useNativePlayback();
  const [incomingLibrary, setIncomingLibrary] = useState<{ connectionId: string } | null>(null);
  const stopRiveScene = () => {
    sceneInterrupted.current = true;
    riveHaptics.stop();
    pauseRef.current(true);
    setPaused(true);
  };
  const library = useReceivedLibrary({
    onPlay: () => {
      stopRiveScene();
      legacyConnection.current = null;
      playback.stopPattern();
    },
    onReceive: (connectionId) => setIncomingLibrary({ connectionId }),
  });
  const [manifestRevision, setManifestRevision] = useState<Record<string, number>>({});
  const announce = (text: string) => setEvent({ id: Date.now(), text });
  const setMap = (value: Record<string, Pattern>) => {
    map.current = value;
    setMappedNames([
      ...new Set([...Object.keys(value), ...Object.keys(riveConfig.current?.haptics ?? {})]),
    ]);
  };
  const clearScene = () => {
    sceneCompleted.current = false;
    sceneInterrupted.current = false;
    playback.stopPattern();
    riveHaptics.setEnabled(false);
    riveHaptics.stop();
    riveConfig.current = undefined;
    sceneConnection.current = null;
    legacyConnection.current = null;
    setRiv(null);
    setMap({});
    setTriggers([]);
    setPaused(false);
    setLastFired(null);
  };
  const relay = usePhoneRelay(
    (message, connection, connectionId) => {
      if (isReceivedResourceMessage(message)) {
        void library
          .receive(connectionId, message, connection)
          .catch(() =>
            announce(
              message.type === "haptic-preset"
                ? "Could not save this pattern on the device."
                : "Could not load media on the device.",
            ),
          );
      } else if (message.type === "library-manifest") {
        void library
          .manifest(connectionId, message.presets)
          .then(() => {
            setManifestRevision((previous) => ({
              ...previous,
              [connectionId]: (previous[connectionId] ?? 0) + 1,
            }));
          })
          .catch(() => announce("Could not update saved pattern names."));
      } else if (message.type === "load") {
        const url = resolveRiveUrl(message.riv, connection);
        if (!url) {
          announce("Studio sent an invalid animation address.");
          return;
        }
        sceneConnection.current = connectionId;
        sceneCompleted.current = false;
        sceneInterrupted.current = false;
        riveHaptics.setEnabled(false);
        riveHaptics.stop();
        riveConfig.current = message.riveConfig;
        setMap(message.map);
        setPaused(false);
        setTriggers([]);
        setRiv({ url, stateMachine: message.stateMachine, riveConfig: message.riveConfig });
        setRun((value) => value + 1);
      } else if (message.type === "map" && sceneConnection.current === connectionId)
        setMap(message.map);
      else if (message.type === "play") {
        stopRiveScene();
        library.stop();
        legacyConnection.current = connectionId;
        playback.playPattern(message.pattern, "Pattern from Studio");
        announce("Pattern from Studio");
      } else if (message.type === "stop") {
        if (sceneConnection.current === connectionId) stopRiveScene();
        stopLegacyFromBrowser(legacyConnection.current, connectionId, playback.stopPattern);
      } else if (message.type === "fire" && sceneConnection.current === connectionId)
        fireRef.current(message.name);
      else if (message.type === "restart" && sceneConnection.current === connectionId) {
        sceneCompleted.current = false;
        sceneInterrupted.current = false;
        riveHaptics.stop();
        setPaused(false);
        setRun((value) => value + 1);
      } else if (message.type === "pause" && sceneConnection.current === connectionId) {
        pauseRef.current(message.paused);
        setPaused(message.paused);
      }
    },
    clearScene,
    (connectionId) => {
      if (connectionId === sceneConnection.current || connectionId === legacyConnection.current)
        clearScene();
      void library.purge(connectionId).catch(() => announce("Could not remove saved patterns."));
    },
  );
  const disconnect = (connectionId = relay.currentConnectionId) => {
    if (!connectionId) return;
    void relay.disconnect(connectionId).catch(() => announce("Could not remove this connection."));
  };
  const onTrigger = (name: string) => {
    if (sceneCompleted.current) return;
    const actions = riveConfig.current?.haptics;
    const action = actions && Object.hasOwn(actions, name) ? actions[name] : undefined;
    const phase = riveHaptics.ownsPhase(name);
    const pattern = !phase && Object.hasOwn(map.current, name) ? map.current[name] : undefined;
    // A clock-owned phase trigger only marks the phase.
    if (action && !phase) {
      if (action.kind === "sequence") {
        library.stop();
        playback.stopPattern();
      }
    } else if (pattern) {
      riveHaptics.stopImpacts();
      library.stop();
      playback.playPattern(pattern, name, false);
    }
    riveHaptics.trigger(name, action);
    setLastFired({ name, id: Date.now() });
    const role =
      action || pattern || phase ? "haptic" : deriveTriggerRole(name, [], riveConfig.current);
    announce(
      role === "haptic"
        ? `▸ ${name}`
        : `▸ ${name} · ${role === "control" ? "animation control" : "no haptic mapped"}`,
    );
    if (sceneConnection.current) relay.send({ type: "fired", name }, sceneConnection.current);
  };
  const replay = () => {
    sceneCompleted.current = false;
    sceneInterrupted.current = false;
    riveHaptics.stop();
    Presets.System.selection();
    setPaused(false);
    setRun((value) => value + 1);
  };
  const togglePause = () => {
    if (paused && (sceneCompleted.current || sceneInterrupted.current)) {
      replay();
      return;
    }
    Presets.System.selection();
    pauseRef.current(!paused);
    setPaused(!paused);
  };
  return {
    relay,
    playback,
    library,
    manifestRevision,
    incomingLibrary,
    riv,
    triggers,
    mappedNames,
    run,
    paused,
    event,
    lastFired,
    fireRef,
    pauseRef,
    sceneOwner,
    setTriggers,
    onTrigger,
    stopRiveHaptics: riveHaptics.stop,
    setRiveHapticsEnabled: riveHaptics.setEnabled,
    mountRiveScene: riveHaptics.mount,
    bindRiveScene: riveHaptics.bind,
    replay,
    togglePause,
    disconnect,
  };
}
