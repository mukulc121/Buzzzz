import { useEffect, useRef, useState } from "react";
import type { IRoom } from "../connection/cloud";
import { leaseRiveUpload } from "./riveUploadCache";
interface IUpload {
  buffer: ArrayBuffer | null;
  room: IRoom | null;
  enabled: boolean;
  onError: (message: string) => void;
}
export function useUploadedRive(props: IUpload) {
  const { buffer, room, enabled, onError } = props;
  const roomId = room?.roomId ?? "lan";
  const lease = useRef<ReturnType<typeof leaseRiveUpload> | null>(null);
  const [uploaded, setUploaded] = useState<{
    buffer: ArrayBuffer;
    roomId: string;
    path: string;
  } | null>(null);
  useEffect(() => {
    if (!buffer) return;
    const current = leaseRiveUpload(buffer, room, onError);
    lease.current = current;
    return () => {
      current.release();
      if (lease.current === current) lease.current = null;
    };
  }, [buffer, room, roomId, onError]);
  useEffect(() => {
    if (!buffer || !enabled) return;
    let active = true;
    void lease.current
      ?.load()
      .then((path) => {
        if (active) setUploaded({ buffer, roomId, path });
      })
      .catch((error: unknown) => {
        if (active) onError(error instanceof Error ? error.message : "Could not send Rive file");
      });
    return () => {
      active = false;
    };
  }, [buffer, room, roomId, enabled, onError]);
  return uploaded?.buffer === buffer && uploaded.roomId === roomId ? uploaded.path : null;
}
