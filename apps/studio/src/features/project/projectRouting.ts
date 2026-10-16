import { sharedLink } from "./repository";

const PROJECTS = "/studio/projects";
const SHARE_PARAMS = ["shareRoom", "shareId", "shareToken"];

export type TProjectRoute =
  | { kind: "dashboard" }
  | { kind: "project"; projectId: string }
  | { kind: "shared"; projectId: string }
  | { kind: "legacy" }
  | { kind: "missing" };

export function parseProjectRoute(url: Pick<URL, "pathname" | "search">): TProjectRoute {
  const shared = sharedLink(url.search);
  if (shared) return { kind: "shared", projectId: shared };
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === PROJECTS) return { kind: "dashboard" };
  if (path === "/" || path === "/studio") return { kind: "legacy" };
  const match = /^\/studio\/projects\/([^/]+)$/.exec(path);
  if (!match) return { kind: "missing" };
  try {
    const projectId = decodeURIComponent(match[1]);
    return /^[\w-]{1,64}$/.test(projectId) && !projectId.startsWith("shared-")
      ? { kind: "project", projectId }
      : { kind: "missing" };
  } catch {
    return { kind: "missing" };
  }
}

export function projectRouteUrl(current: URL, projectId?: string) {
  const url = new URL(current);
  url.pathname = projectId ? `${PROJECTS}/${encodeURIComponent(projectId)}` : PROJECTS;
  for (const key of SHARE_PARAMS) url.searchParams.delete(key);
  return url;
}
