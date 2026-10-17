import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Msg } from "@buzzzz/core";
import { cloudOrigin, type IRoom } from "../connection/cloud";
import type { useProject } from "../project/useProject";
import type { TConflictChoice } from "../project/model";
import { CanonicalSession, type ISyncDocument, type ISyncView } from "./session";
import { deriveSyncStatus } from "./sync";
import { readSyncBases } from "./syncStorage";

interface ICanonicalProject {
  room: IRoom | null;
  subscribe: (listener: (message: Msg) => void) => () => void;
  document: Pick<
    ReturnType<typeof useProject>,
    "project" | "projectId" | "isWriter" | "begin" | "setProject" | "catalog"
  >;
  onError: (message: string) => void;
}
interface IView extends ISyncView {
  key: string | null;
}

const IDLE: ISyncView = { pending: false, conflict: null, error: null };

export function useCanonicalProject(props: ICanonicalProject) {
  const { room, subscribe, document, onError } = props;
  const { project, projectId, isWriter } = document;
  const origin = cloudOrigin();
  const key = origin && room && isWriter ? `${room.roomId}\u0000${projectId}` : null;
  const latest = useRef({ document, onError });
  useLayoutEffect(() => {
    latest.current = { document, onError };
  });
  const [bases] = useState(readSyncBases);
  const session = useRef<CanonicalSession | null>(null);
  const [view, setView] = useState<IView>({ ...IDLE, key: null });
  const current = view.key === key ? view : IDLE;

  useEffect(() => {
    if (!key || !origin || !room) return;
    const read = (): ISyncDocument => {
      const doc = latest.current.document;
      return {
        project: doc.project,
        begin: doc.begin,
        setProject: doc.setProject,
        saveCopy: async () => (await doc.catalog.duplicate(doc.projectId)) !== null,
      };
    };
    const active = new CanonicalSession({
      origin,
      room,
      projectId,
      bases,
      document: read,
      onView: (patch) =>
        setView((value) => ({ ...(value.key === key ? value : IDLE), ...patch, key })),
      onError: (message) => latest.current.onError(message),
    });
    session.current = active;
    void active.start();
    const unsubscribe = subscribe((message) => {
      if (message.type === "project-changed") active.remoteChanged(message.revision);
    });
    return () => {
      unsubscribe();
      active.stop();
      if (session.current === active) session.current = null;
    };
  }, [key, origin, room, projectId, subscribe, bases]);

  useEffect(() => {
    session.current?.localChanged();
  }, [project]);

  return {
    status: deriveSyncStatus({
      hasRoom: Boolean(origin && room),
      isWriter,
      hasConflict: current.conflict !== null,
      error: current.error,
      pending: current.pending,
    }),
    conflict: current.conflict,
    error: current.error,
    resolve: (choice: TConflictChoice) => void session.current?.resolve(choice),
    retry: () => void session.current?.start(),
  };
}
export type CanonicalProject = ReturnType<typeof useCanonicalProject>;
