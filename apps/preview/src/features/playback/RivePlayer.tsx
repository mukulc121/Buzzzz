import {
  useCallback,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentProps,
  type RefObject,
} from "react";
import { ActivityIndicator, Text } from "react-native";
import { useRiveFile } from "@rive-app/react-native";
import { RiveScene } from "./RiveScene";
import { claimSceneOwner, type ISceneOwner } from "./sceneOwnership";

interface IRivePlayer extends Omit<ComponentProps<typeof RiveScene>, "file" | "owns"> {
  url: string;
  run: number;
  onSceneMount: () => void;
  ownerRef: RefObject<ISceneOwner | null>;
}
export function RivePlayer(props: IRivePlayer) {
  const { url, run, onSceneMount, ownerRef, ...scene } = props;
  const [owner] = useState<ISceneOwner>(() => ({ live: false }));
  useLayoutEffect(
    () => claimSceneOwner(ownerRef, owner, scene.active ?? true),
    [ownerRef, owner, scene.active],
  );
  const owns = useCallback(() => ownerRef.current === owner, [ownerRef, owner]);
  const mountHaptics = useEffectEvent(() => {
    if (owns()) onSceneMount();
  });
  useLayoutEffect(() => mountHaptics(), [url, run]);
  const source = useMemo(() => (/^https?:/.test(url) ? url : { uri: url }), [url]);
  const { riveFile, error } = useRiveFile(source);
  const { t } = scene;
  if (error)
    return (
      <Text style={{ color: t.err, padding: 20 }}>
        Could not load this animation. Send the Rive file again from Studio.
      </Text>
    );
  if (!riveFile) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;
  return <RiveScene key={run} file={riveFile} owns={owns} {...scene} />;
}
