import { useRef, useState } from "react";
import { Presets } from "react-native-pulsar";
import { resolveRiveUrl, type Pattern } from "@buzzzz/core";
import { usePhoneRelay } from "../connection/usePhoneRelay";
import { useNativePlayback } from "../playback/useNativePlayback";
import { useReceivedLibrary } from "../sessionLibrary/useReceivedLibrary";

export function usePreviewSession() {
  const [riv, setRiv] = useState<{ url: string; stateMachine?: string } | null>(null);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [mappedNames, setMappedNames] = useState<string[]>([]);
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const [event, setEvent] = useState<{ id: number; text: string } | null>(null);
  const [lastFired, setLastFired] = useState<{ name: string; id: number } | null>(null);
  const map = useRef<Record<string, Pattern>>({});
  const fireRef = useRef<(name: string) => void>(() => {});
  const pauseRef = useRef<(paused: boolean) => void>(() => {});
  const sceneConnection = useRef<string | null>(null);
  const legacyConnection = useRef<string | null>(null);
  const playback = useNativePlayback();
  const library = useReceivedLibrary({ onPlay: playback.stopPattern });
  const [manifestRevision, setManifestRevision] = useState<Record<string, number>>({});
  const [incomingLibrary, setIncomingLibrary] = useState<{ connectionId: string } | null>(null);
  const announce = (text: string) => setEvent({ id: Date.now(), text });
  const setMap = (value: Record<string, Pattern>) => {
    map.current = value;
    setMappedNames(Object.keys(value));
  };
  const clearScene = () => {
    playback.stopPattern();
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
      if (message.type === "haptic-preset") {
        setIncomingLibrary({ connectionId });
        void library
          .receive(connectionId, message)
          .catch(() => announce("Could not save this pattern on the device."));
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
        setMap(message.map);
        const next = { url, stateMachine: message.stateMachine };
        if (riv?.url !== next.url || riv.stateMachine !== next.stateMachine) {
          setPaused(false);
          setTriggers([]);
          setRiv(next);
        }
      } else if (message.type === "map" && sceneConnection.current === connectionId)
        setMap(message.map);
      else if (message.type === "play") {
        library.stop();
        legacyConnection.current = connectionId;
        playback.playPattern(message.pattern, "Pattern from Studio");
        announce("Pattern from Studio");
      } else if (message.type === "stop") {
        if (legacyConnection.current === connectionId) playback.stopPattern();
      } else if (message.type === "fire" && sceneConnection.current === connectionId)
        fireRef.current(message.name);
      else if (message.type === "restart" && sceneConnection.current === connectionId) {
        setPaused(false);
        setRun((value) => value + 1);
      } else if (message.type === "pause" && sceneConnection.current === connectionId) {
        pauseRef.current(message.paused);
        setPaused(message.paused);
      }
    },
    clearScene,
    (connectionId) => {
      void library.purge(connectionId).catch(() => announce("Could not remove saved patterns."));
    },
  );
  const disconnect = (connectionId = relay.currentConnectionId) => {
    if (!connectionId) return;
    if (connectionId === sceneConnection.current || connectionId === legacyConnection.current)
      clearScene();
    void relay.disconnect(connectionId).catch(() => announce("Could not remove this connection."));
  };
  const onTrigger = (name: string) => {
    const pattern = Object.hasOwn(map.current, name) ? map.current[name] : undefined;
    if (pattern) {
      library.stop();
      playback.playPattern(pattern, name, false);
    }
    setLastFired({ name, id: Date.now() });
    announce(pattern ? `▸ ${name}` : `▸ ${name} · no haptic mapped`);
    if (sceneConnection.current) relay.send({ type: "fired", name }, sceneConnection.current);
  };
  const replay = () => {
    Presets.System.selection();
    setPaused(false);
    setRun((value) => value + 1);
  };
  const togglePause = () => {
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
    setTriggers,
    onTrigger,
    replay,
    togglePause,
    disconnect,
  };
}
