import { afterEach, describe, expect, test } from "bun:test";
import { emptyPattern, type Project } from "@buzzzz/core";
import { CanonicalSession, type ISyncView } from "../src/features/mcp/session";
import { planSync, type ISyncBase } from "../src/features/mcp/sync";

const project = (name: string): Project => ({
  presets: [{ id: "tap", name, pattern: emptyPattern() }],
  map: {},
});
const room = { roomId: "r".repeat(32), hostToken: "t".repeat(43) };
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("planSync", () => {
  const mine = project("Mine");
  const theirs = project("Theirs");
  const base = (json: string): ISyncBase => ({ projectId: "p", revision: 1, json });
  const plan = (canonical: Project | null, local: Project, known?: ISyncBase, projectId = "p") =>
    planSync({
      canonical: { project: canonical, revision: 2, projectId: null },
      localJson: JSON.stringify(local),
      base: known,
      projectId,
    });

  test("covers the room and local matrix", () => {
    expect(plan(null, mine)).toBe("push");
    expect(plan(mine, mine)).toBe("push");
    const bound = { project: mine, revision: 2, projectId: "p" };
    expect(
      planSync({
        canonical: bound,
        localJson: JSON.stringify(mine),
        base: undefined,
        projectId: "p",
      }),
    ).toBe("adopt");
    expect(plan(theirs, mine)).toBe("conflict");
    expect(plan(theirs, mine, base(JSON.stringify(mine)), "other")).toBe("push");
    expect(plan(theirs, mine, base(JSON.stringify(mine)))).toBe("apply");
    expect(plan(theirs, mine, base(JSON.stringify(project("Older"))))).toBe("conflict");
    expect(plan(theirs, mine, base(JSON.stringify(theirs)))).toBe("push");
    expect(
      planSync({
        canonical: { project: theirs, revision: 1, projectId: "p" },
        localJson: JSON.stringify(mine),
        base: base(JSON.stringify(theirs)),
        projectId: "p",
      }),
    ).toBe("push");
    const owned = { project: theirs, revision: 2, projectId: "other" };
    expect(
      planSync({
        canonical: owned,
        localJson: JSON.stringify(mine),
        base: undefined,
        projectId: "p",
      }),
    ).toBe("push");
  });
});

function harness(local: Project, responses: (() => Response)[]) {
  const calls: string[] = [];
  const bodies: unknown[] = [];
  globalThis.fetch = Object.assign(
    async (_url: string | URL | Request, init?: RequestInit) => {
      calls.push(init?.method ?? "GET");
      if (typeof init?.body === "string") bodies.push(JSON.parse(init.body));
      const next = responses.shift();
      if (!next) throw new Error("Unexpected request");
      return next();
    },
    { preconnect: realFetch.preconnect },
  );
  const views: Partial<ISyncView>[] = [];
  const bases = new Map<string, ISyncBase>();
  const state = { project: local };
  const session = new CanonicalSession({
    origin: "https://relay.example",
    room,
    projectId: "p",
    bases,
    document: () => ({
      project: state.project,
      begin: () => {},
      setProject: (next) => {
        state.project = next;
      },
      saveCopy: async () => true,
    }),
    onView: (patch) => views.push(patch),
    onError: () => {},
  });
  return { calls, bodies, views, bases, state, session };
}
const ok =
  (body: unknown, status = 200) =>
  () =>
    Response.json(body, { status });
const settle = () => Bun.sleep(5);

describe("CanonicalSession", () => {
  test("seeds an empty room and ignores its own echo", async () => {
    const mine = project("Mine");
    const sync = harness(mine, [
      ok({ project: null, revision: 0 }),
      ok({ project: mine, revision: 1 }),
    ]);
    await sync.session.start();
    expect(sync.calls).toEqual(["GET", "PUT"]);
    expect(sync.bodies).toEqual([{ project: mine, baseRevision: 0, projectId: "p" }]);
    expect(sync.bases.get(room.roomId)?.revision).toBe(1);
    sync.session.remoteChanged(1);
    await settle();
    expect(sync.calls).toEqual(["GET", "PUT"]);
    sync.session.stop();
  });

  test("a remote change during unsaved edits makes one GET and then waits in conflict", async () => {
    const theirs = project("Theirs");
    const sync = harness(project("Edited"), [ok({ project: theirs, revision: 2 })]);
    sync.bases.set(room.roomId, {
      projectId: "p",
      revision: 1,
      json: JSON.stringify(project("Base")),
    });
    sync.session.remoteChanged(2);
    await settle();
    sync.session.remoteChanged(2);
    await settle();
    expect(sync.calls).toEqual(["GET"]);
    expect(sync.views.some((view) => view.conflict?.revision === 2)).toBe(true);
    expect(sync.state.project.presets[0].name).toBe("Edited");
    sync.session.stop();
  });

  test("applies a remote change when local edits are synced, and keeps theirs on use-theirs", async () => {
    const base = project("Base");
    const theirs = project("Theirs");
    const sync = harness(base, [ok({ project: theirs, revision: 2 })]);
    sync.bases.set(room.roomId, { projectId: "p", revision: 1, json: JSON.stringify(base) });
    sync.session.remoteChanged(2);
    await settle();
    expect(sync.state.project).toEqual(theirs);
    expect(sync.bases.get(room.roomId)?.revision).toBe(2);
    sync.session.stop();
  });

  test("a failed GET does not retry by itself", async () => {
    const sync = harness(project("Edited"), [ok({ error: "Room rate limit reached" }, 429)]);
    sync.bases.set(room.roomId, { projectId: "p", revision: 1, json: "{}" });
    sync.session.remoteChanged(2);
    await settle();
    expect(sync.calls).toEqual(["GET"]);
    expect(sync.views.some((view) => view.error === "Room rate limit reached")).toBe(true);
    sync.session.stop();
  });
});
