import { useEffect, useEffectEvent, useRef } from "react";
import type { Msg, Project } from "@buzzzz/core";
import { phoneLibrary } from "./phoneLibrary";

interface IPhoneLibrary {
  presets: Project["presets"];
  connected: boolean;
  joinVersion: number;
  send: (message: Msg) => void;
  subscribe: (listener: (message: Msg) => void) => () => void;
}

export function usePhoneLibrary(props: IPhoneLibrary) {
  const { presets, connected, joinVersion, send, subscribe } = props;
  const manifest = phoneLibrary(presets);
  const signature = JSON.stringify(manifest.presets);
  const published = useRef<string | null>(null);
  const publish = useEffectEvent(() => {
    if (!connected) return;
    send(manifest);
    published.current = signature;
  });
  useEffect(() => {
    if (connected) publish();
  }, [connected, joinVersion]);
  useEffect(() => {
    if (!connected || published.current === signature) return;
    const timer = setTimeout(publish, 300);
    return () => clearTimeout(timer);
  }, [signature, connected]);
  useEffect(
    () =>
      subscribe((message) => {
        if (message.type === "library-manifest-request") publish();
      }),
    [subscribe],
  );
}
