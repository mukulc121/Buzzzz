import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
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
  const request = useMemo(() => (buffer ? { buffer, room } : null), [buffer, room]);
  const reportError = useEffectEvent(onError);
  const lease = useRef<ReturnType<typeof leaseRiveUpload> | null>(null);
  const [uploaded, setUploaded] = useState<{
    request: NonNullable<typeof request>;
    path: string;
  } | null>(null);
  useEffect(() => {
    if (!request) return;
    const current = leaseRiveUpload(request.buffer, request.room, (message) =>
      reportError(message),
    );
    lease.current = current;
    return () => {
      current.release();
      if (lease.current === current) lease.current = null;
    };
  }, [request]);
  useEffect(() => {
    if (!request || !enabled || !lease.current) return;
    const current = lease.current;
    let active = true;
    void current
      .load()
      .then((path) => {
        if (active && lease.current === current) setUploaded({ request, path });
      })
      .catch((error: unknown) => {
        if (active)
          reportError(error instanceof Error ? error.message : "Could not send Rive file");
      });
    return () => {
      active = false;
    };
  }, [request, enabled]);
  return uploaded?.request === request ? uploaded.path : null;
}
