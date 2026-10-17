import { useEffect, useEffectEvent, useRef } from "react";
import { isRecord, isProject, type Project } from "@buzzzz/core";
import { cloudOrigin } from "./cloud";

interface ISharedProject {
  ready: boolean;
  projectId: string;
  onLoad: (project: Project) => void;
  onError: (message: string) => void;
}
export function useSharedProject(props: ISharedProject) {
  const loaded = useRef(false);
  const onLoad = useEffectEvent(props.onLoad);
  const onError = useEffectEvent(props.onError);
  useEffect(() => {
    if (!props.ready) return;
    const params = new URL(location.href).searchParams;
    const room = params.get("shareRoom"),
      id = params.get("shareId"),
      token = params.get("shareToken");
    if (loaded.current || props.projectId !== `shared-${id}`) return;
    if (!room && !id && !token) return;
    const origin = cloudOrigin();
    if (
      !origin ||
      !room ||
      !id ||
      !token ||
      !/^[a-f0-9]{32}$/.test(room) ||
      !/^[a-f0-9]{32}$/.test(id) ||
      !/^[A-Za-z0-9_-]{43}$/.test(token)
    ) {
      onError("This shared project link is invalid or the relay is not configured");
      return;
    }
    const controller = new AbortController();
    void fetch(`${origin}/v1/shares/${room}/${id}?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
      referrerPolicy: "no-referrer",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("This share link has expired or was revoked");
        const data: unknown = await response.json();
        if (!isRecord(data) || !isProject(data.project))
          throw new Error("The shared project is invalid");
        if (!controller.signal.aborted) {
          loaded.current = true;
          onLoad(data.project);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          onError(error instanceof Error ? error.message : "Could not open shared project");
      });
    return () => controller.abort();
  }, [props.ready, props.projectId]);
}
