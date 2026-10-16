import { playbackCommand } from "./playbackCommand";
import { useEffect, useEffectEvent, type RefObject } from "react";
import { ActivityIndicator, Text } from "react-native";
import {
  Fit,
  RiveView,
  useRive,
  useRiveFile,
  useViewModelInstance,
  type RiveFile,
} from "@rive-app/react-native";
import type { Theme } from "../../theme/colors";
interface IRiveScene {
  stateMachine?: string;
  paused?: boolean;
  active?: boolean;
  t: Theme;
  onTrigger: (name: string) => void;
  onTriggers: (names: string[]) => void;
  fireRef: RefObject<(name: string) => void>;
  pauseRef: RefObject<(paused: boolean) => void>;
}

interface IRivePlayer extends IRiveScene {
  url: string;
  run: number;
}
export function RivePlayer(props: IRivePlayer) {
  const { url, run, ...scene } = props;
  const { riveFile, error } = useRiveFile(url);
  const { t } = scene;
  if (error)
    return (
      <Text style={{ color: t.err, padding: 20 }}>
        Could not load this animation. Send the Rive file again from Studio.
      </Text>
    );
  if (!riveFile) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;
  return <RiveScene key={run} file={riveFile} {...scene} />;
}

interface IBoundRiveScene extends IRiveScene {
  file: RiveFile;
}
function RiveScene(props: IBoundRiveScene) {
  const {
    file,
    stateMachine,
    onTrigger,
    onTriggers,
    fireRef,
    pauseRef,
    paused = false,
    active = true,
  } = props;
  const { instance } = useViewModelInstance(file, { async: true });
  const { riveViewRef, setHybridRef } = useRive();
  const onFired = useEffectEvent(onTrigger);

  useEffect(() => {
    pauseRef.current = (paused) => void riveViewRef?.[playbackCommand({ paused, active })]();
    return () => {
      pauseRef.current = () => {};
    };
  }, [riveViewRef, pauseRef, active]);

  useEffect(() => {
    void riveViewRef?.[playbackCommand({ paused, active })]();
  }, [paused, active, riveViewRef]);

  // Bound view-model triggers are the haptic slots.
  useEffect(() => {
    if (!instance) return;
    let dead = false;
    const props = new Map<string, NonNullable<ReturnType<typeof instance.triggerProperty>>>();
    const unsubs: (() => void)[] = [];
    const subscribe = async () => {
      const list = await instance.getPropertiesAsync();
      if (dead) return;
      for (const { name, type } of list) {
        if (type !== "trigger") continue;
        const tp = instance.triggerProperty(name);
        if (!tp) continue;
        props.set(name, tp);
        unsubs.push(tp.addListener(() => onFired(name)));
      }
      onTriggers([...props.keys()]);
    };
    void subscribe().catch(() => {
      if (!dead) onTriggers([]);
    });
    fireRef.current = (name) => props.get(name)?.trigger();
    return () => {
      dead = true;
      unsubs.forEach((u) => u());
      props.forEach((p) => p.dispose());
      fireRef.current = () => {};
    };
  }, [instance, fireRef, onTriggers]);

  return (
    <RiveView
      style={{ flex: 1 }}
      file={file}
      hybridRef={setHybridRef}
      stateMachineName={stateMachine}
      dataBind={instance ?? undefined}
      autoPlay
      fit={Fit.Contain}
    />
  );
}
