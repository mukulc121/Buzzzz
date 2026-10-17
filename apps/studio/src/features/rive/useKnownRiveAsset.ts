import { useEffect, useEffectEvent, useState } from "react";
import type { IRiveConfig } from "@buzzzz/core";
import { knownRiveConfig } from "./knownAsset";

interface IKnownRiveAsset {
  buffer: ArrayBuffer | null;
  projectId: string;
  ownerId: string | null;
  config: IRiveConfig | undefined;
  hasCustomMap: boolean;
  active: boolean;
  writable: boolean;
  onConfigResolved: (
    config: IRiveConfig,
    target: { projectId: string; ownerId: string },
  ) => boolean;
  onError: (message: string) => void;
}

const verifications = new WeakMap<ArrayBuffer, Promise<IRiveConfig | undefined>>();

function verify(buffer: ArrayBuffer) {
  let pending = verifications.get(buffer);
  if (!pending) {
    pending = knownRiveConfig(buffer);
    verifications.set(buffer, pending);
    pending.catch(() => verifications.delete(buffer));
  }
  return pending;
}

export function useKnownRiveAsset(props: IKnownRiveAsset) {
  const { buffer, projectId, ownerId, config, hasCustomMap, active, writable } = props;
  const [verified, setVerified] = useState<{
    buffer: ArrayBuffer;
    known: IRiveConfig | undefined;
  } | null>(null);
  const commit = useEffectEvent(props.onConfigResolved);
  const reportError = useEffectEvent(props.onError);
  const explicit = !buffer || !ownerId || !!config || hasCustomMap;
  const current = verified?.buffer === buffer ? verified : null;
  useEffect(() => {
    if (explicit || !buffer || !active) return;
    let alive = true;
    verify(buffer).then(
      (known) => {
        if (alive) setVerified({ buffer, known });
      },
      () => {
        if (alive) reportError("Could not verify the Rive animation's default haptics.");
      },
    );
    return () => {
      alive = false;
    };
  }, [buffer, explicit, active]);
  const known = current?.known;
  useEffect(() => {
    if (explicit || !known || !ownerId || !active) return;
    if (!writable)
      reportError("Open this project for editing to restore this animation's default haptics.");
    else if (!commit(structuredClone(known), { projectId, ownerId }))
      reportError("Could not save the animation's default haptics. Nothing was changed.");
  }, [explicit, known, ownerId, active, writable, projectId]);
  return explicit || (current !== null && !current.known);
}
