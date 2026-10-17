import type { ComponentProps } from "react";
import { ActivityIndicator, Text } from "react-native";
import { useRiveFile } from "@rive-app/react-native";
import { RiveScene } from "./RiveScene";

interface IRivePlayer extends Omit<ComponentProps<typeof RiveScene>, "file"> {
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
