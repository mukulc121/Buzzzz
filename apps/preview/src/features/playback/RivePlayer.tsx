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
      <Text style={{ color: t.err, padding: 20 }}>Could not load Rive file: {error.message}</Text>
    );
  if (!riveFile) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;
  return <RiveScene key={run} file={riveFile} {...scene} />;
}

interface IBoundRiveScene extends IRiveScene {
  file: RiveFile;
}
function RiveScene(props: IBoundRiveScene) {
  const { file, stateMachine, onTrigger, onTriggers, fireRef, pauseRef } = props;
  const { instance } = useViewModelInstance(file, { async: true });
  const { riveViewRef, setHybridRef } = useRive();
  const onFired = useEffectEvent(onTrigger);

  useEffect(() => {
    pauseRef.current = (paused) => void (paused ? riveViewRef?.pause() : riveViewRef?.play());
    return () => {
      pauseRef.current = () => {};
    };
  }, [riveViewRef, pauseRef]);

  // Subscribe to every trigger property on the bound view model — these are the haptic slots.
  useEffect(() => {
    if (!instance) return;
    let dead = false;
    const props = new Map<string, NonNullable<ReturnType<typeof instance.triggerProperty>>>();
    const unsubs: (() => void)[] = [];
    void instance
      .getPropertiesAsync()
      .then((list) => {
        if (dead) return;
        for (const { name, type } of list) {
          if (type !== "trigger") continue;
          const tp = instance.triggerProperty(name);
          if (!tp) continue;
          props.set(name, tp);
          unsubs.push(tp.addListener(() => onFired(name)));
        }
        onTriggers([...props.keys()]);
      })
      .catch(() => {
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
