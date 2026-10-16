import { expect, test } from "bun:test";
import {
  parseProjectRoute,
  projectRouteUrl,
  type TProjectRoute,
} from "../src/features/project/projectRouting";

test("project paths distinguish saved projects, the dashboard, and invalid routes", () => {
  const cases: [string, TProjectRoute][] = [
    ["/", { kind: "legacy" }],
    ["/studio", { kind: "legacy" }],
    ["/studio/projects/", { kind: "dashboard" }],
    ["/studio/projects/project-a", { kind: "project", projectId: "project-a" }],
    ["/studio/projects/%61", { kind: "project", projectId: "a" }],
    ["/studio/projects/%", { kind: "missing" }],
    ["/studio/projects/a%2Fb", { kind: "missing" }],
    ["/studio/projects/shared-local", { kind: "missing" }],
    ["/studio/projects/a/extra", { kind: "missing" }],
    [`/studio/projects/${"a".repeat(65)}`, { kind: "missing" }],
  ];
  for (const [path, expected] of cases) {
    expect(parseProjectRoute(new URL(path, "https://buzzzz.test"))).toEqual(expected);
  }
});

test("hosted share credentials take precedence over local project paths", () => {
  const url = new URL(
    "https://buzzzz.test/studio/projects/local?shareRoom=room&shareId=abc&shareToken=token#relay",
  );
  expect(parseProjectRoute(url)).toEqual({ kind: "shared", projectId: "shared-abc" });
  expect(url.hash).toBe("#relay");
});

test("local navigation preserves other query and hash state and leaves hosted sharing explicitly", () => {
  const current = new URL(
    "https://buzzzz.test/?preset=tap&shareRoom=room&shareId=abc&shareToken=token#relay=bootstrap",
  );
  const project = projectRouteUrl(current, "project-b");
  expect(project.pathname).toBe("/studio/projects/project-b");
  expect(project.search).toBe("?preset=tap");
  expect(project.hash).toBe("#relay=bootstrap");
  expect(projectRouteUrl(project).pathname).toBe("/studio/projects");
  expect(current.searchParams.get("shareToken")).toBe("token");
});
