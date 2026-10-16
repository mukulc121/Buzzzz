import { useRef, useState } from "react";
import { Presets } from "react-native-pulsar";
import { resolveRiveUrl, type Pattern } from "@buzzzz/core";
import { usePhoneRelay } from "../connection/usePhoneRelay";
import { useNativePlayback } from "../playback/useNativePlayback";

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
  const playback = useNativePlayback();
  const announce = (text: string) => setEvent({ id: Date.now(), text });
  const setMap = (value: Record<string, Pattern>) => {
    map.current = value;
    setMappedNames(Object.keys(value));
  };
  const clearScene = () => {
    playback.stopPattern();
    setRiv(null);
    setMap({});
    setTriggers([]);
    setPaused(false);
    setLastFired(null);
  };
  const relay = usePhoneRelay((message, connection) => {
    if (message.type === "load") {
      const url = resolveRiveUrl(message.riv, connection);
      if (!url) {
        announce("Studio sent an invalid animation address.");
        return;
      }
      setMap(message.map);
      const next = { url, stateMachine: message.stateMachine };
      if (riv?.url !== next.url || riv.stateMachine !== next.stateMachine) {
        setPaused(false);
        setTriggers([]);
        setRiv(next);
      }
    } else if (message.type === "map") setMap(message.map);
    else if (message.type === "play") {
      playback.playPattern(message.pattern, "Pattern from Studio");
      announce("Pattern from Studio");
    } else if (message.type === "stop") playback.stopPattern();
    else if (message.type === "fire") fireRef.current(message.name);
    else if (message.type === "restart") {
      setPaused(false);
      setRun((value) => value + 1);
    } else if (message.type === "pause") {
      pauseRef.current(message.paused);
      setPaused(message.paused);
    }
  }, clearScene);
  const disconnect = () => {
    relay.disconnect();
    clearScene();
  };
  const onTrigger = (name: string) => {
    const pattern = Object.hasOwn(map.current, name) ? map.current[name] : undefined;
    if (pattern) playback.playPattern(pattern, name, false);
    setLastFired({ name, id: Date.now() });
    announce(pattern ? `▸ ${name}` : `▸ ${name} · no haptic mapped`);
    relay.send({ type: "fired", name });
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
