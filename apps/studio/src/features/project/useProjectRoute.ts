import { useEffect, useEffectEvent, useState } from "react";
import { parseProjectRoute, projectRouteUrl, type TProjectRoute } from "./projectRouting";
import { isRecordKey, readRecord } from "./repository";

interface IProjectRoute {
  projectId: string;
  onOpen: (id: string) => boolean;
}

const MISSING =
  "Project not found in this browser. It may have been deleted or saved on another device. Use a hosted share link to open a shared project.";

export function useProjectRoute(props: IProjectRoute) {
  const [route, setRoute] = useState<TProjectRoute>(() => {
    const initial = parseProjectRoute(location);
    if (initial.kind === "legacy") return { kind: "project", projectId: props.projectId };
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

  const openProject = (id: string) => {
    if (id.startsWith("shared-")) {
      if (sharedUrl) navigate(new URL(sharedUrl), { kind: "shared", projectId: id });
      return;
    }
    if (!readRecord(id)) {
      setRoute({ kind: "missing" });
      setNotice(MISSING);
      return;
    }
    navigate(projectRouteUrl(new URL(location.href), id), { kind: "project", projectId: id });
  };

  const readLocation = useEffectEvent(() => {
    const next = parseProjectRoute(location);
    if (next.kind === "legacy") {
      if (!props.projectId.startsWith("shared-"))
        navigate(
          projectRouteUrl(new URL(location.href), props.projectId),
          { kind: "project", projectId: props.projectId },
          true,
        );
      return;
    }
    if ((next.kind === "project" || next.kind === "shared") && !props.onOpen(next.projectId)) {
      setRoute({ kind: "missing" });
      setNotice(MISSING);
      return;
    }
    setRoute(next);
    setNotice(next.kind === "missing" ? MISSING : null);
  });

  useEffect(() => {
    if (parseProjectRoute(location).kind === "legacy")
      history.replaceState(
        history.state,
        "",
        projectRouteUrl(new URL(location.href), props.projectId),
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
  }, [props.projectId]);

  const showDashboard = (removed = false) => {
    navigate(projectRouteUrl(new URL(location.href)), { kind: "dashboard" }, removed);
    if (removed) setNotice("Project removed from this browser.");
  };

  return {
    dashboard: route.kind === "dashboard" || route.kind === "missing",
    notice,
    openProject,
    showDashboard,
    showEditor: () => openProject(props.projectId),
  };
}
