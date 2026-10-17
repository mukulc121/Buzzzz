import { useEffect, useEffectEvent, useState } from "react";
import {
  parseProjectRoute,
  patternRouteId,
  projectPatternUrl,
  projectRouteUrl,
  selectedProjectPattern,
  type TProjectRoute,
} from "./projectRouting";
import { readSelectedPattern, rememberSelectedPattern } from "./projectSelection";
import { isRecordKey, readRecord } from "./repository";

interface IProjectRoute {
  projectId: string;
  projectAvailable: boolean;
  patternId: string;
  onOpen: (id: string, patternId: string | null) => string | null;
}

const MISSING =
  "Project not found in this browser. It may have been deleted or saved on another device. Use a hosted share link to open a shared project.";

export function useProjectRoute(props: IProjectRoute) {
  const [route, setRoute] = useState<TProjectRoute>(() => {
    const initial = parseProjectRoute(location);
    if (initial.kind === "legacy")
      return props.projectAvailable
        ? { kind: "project", projectId: props.projectId }
        : { kind: "dashboard" };
    return initial.kind === "project" && !readRecord(initial.projectId)
      ? { kind: "missing" }
      : initial;
  });
  const [notice, setNotice] = useState<string | null>(route.kind === "missing" ? MISSING : null);
  const [sharedUrl] = useState(() =>
    parseProjectRoute(location).kind === "shared" ? location.href : null,
  );

  const navigate = (url: URL, next: TProjectRoute, replace = false) => {
    if (url.href !== location.href) {
      if (replace) history.replaceState(history.state, "", url);
      else history.pushState(null, "", url);
    }
    setRoute(next);
    setNotice(null);
  };

  const openProject = (id: string, patternId?: string) => {
    if (id.startsWith("shared-")) {
      if (sharedUrl) {
        const url = new URL(sharedUrl);
        navigate(patternId === undefined ? url : projectPatternUrl(url, patternId), {
          kind: "shared",
          projectId: id,
        });
      }
      return;
    }
    const record = readRecord(id);
    if (!record) {
      setRoute({ kind: "missing" });
      setNotice(MISSING);
      return;
    }
    const selected = selectedProjectPattern(
      record.project,
      patternId ?? null,
      readSelectedPattern(id),
    );
    props.onOpen(id, selected);
    navigate(projectRouteUrl(new URL(location.href), id, selected), {
      kind: "project",
      projectId: id,
    });
  };

  const readLocation = useEffectEvent(() => {
    const next = parseProjectRoute(location);
    if (next.kind === "legacy") {
      if (!props.projectAvailable) {
        navigate(projectRouteUrl(new URL(location.href)), { kind: "dashboard" }, true);
        return;
      }
      if (!props.projectId.startsWith("shared-"))
        navigate(
          projectRouteUrl(new URL(location.href), props.projectId, props.patternId),
          { kind: "project", projectId: props.projectId },
          true,
        );
      return;
    }
    if (next.kind === "project" || next.kind === "shared") {
      const selected = props.onOpen(next.projectId, patternRouteId(location));
      if (selected === null) {
        setRoute({ kind: "missing" });
        setNotice(MISSING);
        return;
      }
      if (next.kind === "project") {
        const url = projectPatternUrl(new URL(location.href), selected);
        if (url.href !== location.href) history.replaceState(history.state, "", url);
      }
    }
    setRoute(next);
    setNotice(next.kind === "missing" ? MISSING : null);
  });

  useEffect(() => {
    if (parseProjectRoute(location).kind === "legacy")
      history.replaceState(
        history.state,
        "",
        projectRouteUrl(
          new URL(location.href),
          props.projectAvailable ? props.projectId : undefined,
          props.projectAvailable ? props.patternId : undefined,
        ),
      );
    const onStorage = (event: StorageEvent) => {
      if (isRecordKey(event.key)) readLocation();
    };
    addEventListener("popstate", readLocation);
    addEventListener("storage", onStorage);
    return () => {
      removeEventListener("popstate", readLocation);
      removeEventListener("storage", onStorage);
    };
  }, [props.projectId, props.projectAvailable, props.patternId]);

  useEffect(() => {
    if (!props.projectAvailable) return;
    rememberSelectedPattern(props.projectId, props.patternId);
    const current = parseProjectRoute(location);
    if (current.kind !== "project" || current.projectId !== props.projectId) return;
    const url = projectPatternUrl(new URL(location.href), props.patternId);
    if (url.href !== location.href) history.replaceState(history.state, "", url);
  }, [props.projectId, props.projectAvailable, props.patternId]);

  const selectPattern = (id: string) => {
    const current = parseProjectRoute(location);
    if (
      (current.kind === "project" || current.kind === "shared") &&
      current.projectId === props.projectId
    )
      navigate(projectPatternUrl(new URL(location.href), id), current);
  };

  const showDashboard = (removed = false) => {
    navigate(projectRouteUrl(new URL(location.href)), { kind: "dashboard" }, removed);
    if (removed) setNotice("Project removed from this browser.");
  };

  return {
    dashboard: route.kind === "dashboard" || route.kind === "missing",
    notice,
    openProject,
    showDashboard,
    selectPattern,
    showEditor: () =>
      props.projectAvailable ? openProject(props.projectId, props.patternId) : showDashboard(),
  };
}
