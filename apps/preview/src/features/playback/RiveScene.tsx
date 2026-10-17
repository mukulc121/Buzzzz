import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { ActivityIndicator, AppState, Text } from "react-native";
import {
  Fit,
  RiveView,
  useRive,
  useViewModelInstance,
  type RiveFile,
  type ViewModelInstance,
} from "@rive-app/react-native";
import type { IRiveConfig } from "@buzzzz/core";
import type { Theme } from "../../theme/colors";
import { playbackCommand } from "./playbackCommand";
import { bindRiveTriggers } from "./riveTriggers";

interface IRiveScene {
  file: RiveFile;
  stateMachine?: string;
  riveConfig?: IRiveConfig;
  paused?: boolean;
  active?: boolean;
  t: Theme;
  onTrigger: (name: string) => void;
  onTriggers: (names: string[]) => void;
  onStopHaptics: () => void;
  onHapticsEnabled: (enabled: boolean) => void;
  fireRef: RefObject<(name: string) => void>;
  pauseRef: RefObject<(paused: boolean) => void>;
}

export function RiveScene(props: IRiveScene) {
  const { file, riveConfig, t } = props;
  const selection = riveConfig?.viewModel
    ? { viewModelName: riveConfig.viewModel }
    : riveConfig?.artboard
      ? { artboardName: riveConfig.artboard }
      : {};
  const { instance, isLoading, error } = useViewModelInstance(file, { ...selection, async: true });
  if (error) return <Text style={{ color: t.err, padding: 20 }}>{error.message}</Text>;
  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;
  return <BoundRiveScene {...props} instance={instance} />;
}

interface IBoundRiveScene extends IRiveScene {
  instance: ViewModelInstance | null;
}

function BoundRiveScene(props: IBoundRiveScene) {
  const {
    file,
    stateMachine,
    riveConfig,
    instance,
    t,
    onTrigger,
    onTriggers,
    fireRef,
    pauseRef,
    paused = false,
    active = true,
  } = props;
  const { riveViewRef, setHybridRef } = useRive();
  const requestedPause = useRef(paused);
  const canDispatch = useEffectEvent(
    () => !requestedPause.current && active && AppState.currentState === "active",
  );
  const onFired = useEffectEvent(onTrigger);
  const stopHaptics = useEffectEvent(props.onStopHaptics);
  const enableHaptics = useEffectEvent(props.onHapticsEnabled);
  const [binding, setBinding] = useState<Awaited<ReturnType<typeof bindRiveTriggers>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = !instance || binding !== null;

  useLayoutEffect(() => {
    requestedPause.current = paused;
  }, [paused]);

  useLayoutEffect(() => {
    const controller = new AbortController();
    if (instance)
      void bindRiveTriggers({
        source: instance,
        canDispatch,
        onTrigger: onFired,
        signal: controller.signal,
      }).then(
        (next) => {
          if (controller.signal.aborted) return;
          fireRef.current = next.fire;
          onTriggers(next.names);
          setBinding(next);
        },
        (cause: unknown) => {
          if (controller.signal.aborted) return;
          onTriggers([]);
          setError(cause instanceof Error ? cause.message : "Could not bind Rive triggers.");
        },
      );
    return () => {
      controller.abort();
      fireRef.current = () => {};
      stopHaptics();
    };
  }, [instance, fireRef, onTriggers]);

  useEffect(() => {
    pauseRef.current = (next) => {
      requestedPause.current = next;
      enableHaptics(!next && active && ready);
      void riveViewRef?.[playbackCommand({ paused: next, active })]();
    };
    return () => {
      pauseRef.current = () => {};
    };
  }, [riveViewRef, pauseRef, active, ready]);

  useEffect(() => {
    enableHaptics(!paused && active && ready);
    if (!active) stopHaptics();
    if (ready) void riveViewRef?.[playbackCommand({ paused, active })]();
    return () => enableHaptics(false);
  }, [paused, active, ready, riveViewRef]);

  if (error) return <Text style={{ color: t.err, padding: 20 }}>{error}</Text>;
  if (!ready) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;
  return (
    <RiveView
      style={{ flex: 1 }}
      file={file}
      hybridRef={setHybridRef}
      artboardName={riveConfig?.artboard}
      stateMachineName={stateMachine}
      dataBind={instance ?? undefined}
      autoPlay={false}
      fit={Fit.Contain}
    />
  );
}
