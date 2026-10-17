import { useLayoutEffect, useMemo, useRef } from "react";
import { phoneMediaPlayback, type IPhoneMedia } from "./phoneMedia";
import { phonePlayback, type TPhonePreset } from "./phoneLibrary";
import { createPhoneUpload, phoneUploadTarget } from "./phoneUpload";
import type { IRoom } from "./cloud";

interface IPhonePlayback {
  projectId: string;
  preset: TPhonePreset;
  writable: boolean;
  connected: boolean;
  joinVersion: number;
  room: IRoom | null;
  media: IPhoneMedia;
}

interface IUploadSession {
  session: object;
  room: IRoom | null;
  signal: AbortSignal;
  pending: ReturnType<typeof phoneUploadTarget> | null;
}

function resolveTarget(target: IUploadSession) {
  target.signal.throwIfAborted();
  if (!target.pending) {
    const pending = phoneUploadTarget(target.room, target.signal);
    target.pending = pending;
    void pending.catch(() => {
      if (target.pending === pending) target.pending = null;
    });
  }
  return target.pending;
}

export function usePhonePlayback(props: IPhonePlayback) {
  const { projectId, preset, writable, connected, joinVersion, room, media } = props;
  const session = useMemo(() => ({ connected, joinVersion, room }), [connected, joinVersion, room]);
  const target = useRef<IUploadSession | null>(null);
  const cachedUpload = useRef<{ key: string; upload: ReturnType<typeof createPhoneUpload> } | null>(
    null,
  );
  useLayoutEffect(() => {
    if (!session.connected) {
      target.current = null;
      return;
    }
    const controller = new AbortController();
    const value = { session, room: session.room, signal: controller.signal, pending: null };
    target.current = value;
    void resolveTarget(value).catch(() => {});
    return () => controller.abort();
  }, [session]);
  const scope = useMemo(
    () => ({
      session,
      projectId,
      resourceId: preset.resourceId,
      name: preset.name,
      writable,
      audioFile: media.audio?.file,
      startMs: media.audio?.startMs,
      endMs: media.audio?.endMs,
      volume: media.audio?.volume,
      offsetMs: media.audio?.offsetMs,
      animationFile: media.animation?.file,
      animationFrames: media.animation?.totalFrames,
      animationRate: media.animation?.frameRate,
      animationWidth: media.animation?.width,
      animationHeight: media.animation?.height,
    }),
    [
      session,
      projectId,
      preset.resourceId,
      preset.name,
      writable,
      media.audio?.file,
      media.audio?.startMs,
      media.audio?.endMs,
      media.audio?.volume,
      media.audio?.offsetMs,
      media.animation?.file,
      media.animation?.totalFrames,
      media.animation?.frameRate,
      media.animation?.width,
      media.animation?.height,
    ],
  );
  const current = useRef(scope);
  const requests = useRef(new Set<AbortController>());
  useLayoutEffect(() => {
    current.current = scope;
    const active = requests.current;
    return () => {
      for (const controller of active) controller.abort();
      active.clear();
    };
  }, [scope]);
  return async (remaining: IPhoneMedia["pattern"], identity?: TPhonePreset) => {
    if (!identity) return phonePlayback(remaining);
    const controller = new AbortController();
    requests.current.add(controller);
    if (current.current !== scope || !connected) controller.abort();
    try {
      const message = await phoneMediaPlayback({
        ...media,
        remaining,
        preset: identity,
        signal: controller.signal,
        upload: async (file, contentType, signal) => {
          const request = target.current;
          if (!request || request.session !== session)
            throw new Error("Phone media is disconnected");
          const value = await resolveTarget(request);
          signal.throwIfAborted();
          const key = `${value.origin}/${value.roomId}/${value.hostToken}/${value.uploadOrigin ?? value.origin}`;
          if (cachedUpload.current?.key !== key)
            cachedUpload.current = { key, upload: createPhoneUpload(value) };
          return cachedUpload.current.upload(file, contentType, signal);
        },
      });
      controller.signal.throwIfAborted();
      return message;
    } finally {
      requests.current.delete(controller);
    }
  };
}
