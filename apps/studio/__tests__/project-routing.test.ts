import { expect, test } from "bun:test";
import { emptyPattern } from "@buzzzz/core";
import {
  parseProjectRoute,
  patternRouteId,
  projectPatternUrl,
  selectedProjectPattern,
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

test("pattern URLs preserve project paths, sharing, unrelated queries and fragments", () => {
  const current = new URL(
    "https://buzzzz.test/studio/projects/a?shareId=one&shareToken=secret&relay=two&pattern=old#device",
  );
  const next = projectPatternUrl(current, "pattern / one");
  expect(next.pathname).toBe(current.pathname);
  expect(next.searchParams.get("pattern")).toBe("pattern / one");
  expect(next.searchParams.get("shareId")).toBe("one");
  expect(next.searchParams.get("shareToken")).toBe("secret");
  expect(next.searchParams.get("relay")).toBe("two");
  expect(next.hash).toBe("#device");
  expect(current.searchParams.get("pattern")).toBe("old");
  expect(patternRouteId(next)).toBe("pattern / one");
  const other = projectRouteUrl(current, "b", "other");
  expect(other.searchParams.get("pattern")).toBe("other");
  expect(other.searchParams.has("shareToken")).toBe(false);
  expect(other.searchParams.get("relay")).toBe("two");
  expect(projectRouteUrl(other).searchParams.has("pattern")).toBe(false);
});

test("URL selection wins remembered state and invalid or deleted IDs fall back to the first real pattern", () => {
  const project = {
    presets: [
      { id: "first", name: "First", pattern: emptyPattern() },
      { id: "second", name: "Second", pattern: emptyPattern() },
    ],
  };
  const cases: [string | null, string | null, string][] = [
    ["first", "second", "first"],
    ["second", "first", "second"],
    [null, "second", "second"],
    [null, "missing", "first"],
    ["missing", "second", "first"],
    ["", "second", "first"],
    [null, null, "first"],
  ];
  for (const [requested, remembered, expected] of cases)
    expect(selectedProjectPattern(project, requested, remembered)).toBe(expected);
});
