import { expect, test, type Page } from "@playwright/test";

const stub = `
const pending = new Map();
globalThis.__verify = { calls: [], settle(id, known) { pending.get(id)(known); } };
export function knownRiveConfig(buffer) {
  const id = new Uint8Array(buffer)[0];
  globalThis.__verify.calls.push(id);
  return new Promise((resolve) => pending.set(id, (known) => resolve(known ? { haptics: { hapticEntry: { kind: "stop", trigger: "x" } } } : undefined)));
}
`;
const harness = `
import * as ReactModule from '/node_modules/.vite/deps/react.js';
import * as DOMModule from '/node_modules/.vite/deps/react-dom_client.js';
import { useKnownRiveAsset } from '/src/features/rive/useKnownRiveAsset.ts';
const React = ReactModule.default ?? ReactModule;
const { createRoot } = DOMModule.default ?? DOMModule;
const buffers = { A: new Uint8Array([1]).buffer, B: new Uint8Array([2]).buffer, C: new Uint8Array([3]).buffer };
const log = { gates: [], commits: [], errors: [] };
globalThis.__log = log;
function Harness() {
  const [state, setState] = React.useState({ asset: 'A', projectId: 'p1', ownerId: 'o1', config: undefined, hasCustomMap: false, active: true, writable: true, accept: false });
  globalThis.__set = (patch) => setState((previous) => ({ ...previous, ...patch }));
  const gate = useKnownRiveAsset({
    buffer: state.asset ? buffers[state.asset] : null,
    projectId: state.projectId, ownerId: state.ownerId, config: state.config,
    hasCustomMap: state.hasCustomMap, active: state.active, writable: state.writable,
    onConfigResolved: (config, target) => { log.commits.push({ asset: state.asset, ...target, accepted: state.accept }); return state.accept; },
    onError: (message) => log.errors.push(message),
  });
  if (log.gates.at(-1)?.asset !== state.asset || log.gates.at(-1)?.gate !== gate) log.gates.push({ asset: state.asset, gate });
  return React.createElement('output', { id: 'gate' }, String(gate));
}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(Harness)));
`;

async function mount(page: Page) {
  const entry = await (await page.request.get("/src/main.tsx")).text();
  const react = entry.match(/from "([^"]*\/react\.js\?[^"]*)"/)?.[1];
  const dom = entry.match(/from "([^"]*\/react-dom_client\.js\?[^"]*)"/)?.[1];
  if (!react || !dom) throw new Error("Missing Vite React modules");
  await page.route(/\/src\/features\/rive\/knownAsset\.ts(?:\?.*)?$/, (route) =>
    route.fulfill({ contentType: "application/javascript", body: stub }),
  );
  await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: harness
        .replace("/node_modules/.vite/deps/react.js", react)
        .replace("/node_modules/.vite/deps/react-dom_client.js", dom),
    }),
  );
  await page.goto("/");
  await expect(page.locator("#gate")).toHaveText("false");
}
const set = (page: Page, patch: Record<string, unknown>) =>
  page.evaluate((patch) => (globalThis as any).__set(patch), patch);
const settle = (page: Page, id: number, known: boolean) =>
  page.evaluate(([id, known]) => (globalThis as any).__verify.settle(id, known), [
    id,
    known,
  ] as const);
const log = (page: Page) =>
  page.evaluate(() => ({
    ...(globalThis as any).__log,
    calls: (globalThis as any).__verify.calls,
  }));

test("a late known hash for a replaced asset is ignored, refused commits stay gated and retry", async ({
  page,
}) => {
  await mount(page);
  await set(page, { asset: "B" });
  await settle(page, 1, true);
  await settle(page, 2, false);
  await expect(page.locator("#gate")).toHaveText("true");
  expect((await log(page)).commits).toEqual([]);
  await set(page, { asset: "A", projectId: "p2" });
  await expect
    .poll(async () => (await log(page)).commits)
    .toEqual([{ asset: "A", projectId: "p2", ownerId: "o1", accepted: false }]);
  await expect(page.locator("#gate")).toHaveText("false");
  expect((await log(page)).errors).toEqual([
    "Could not save the animation's default haptics. Nothing was changed.",
  ]);
  await set(page, { active: false });
  await set(page, { active: true, accept: true });
  await expect.poll(async () => (await log(page)).commits.length).toBe(2);
  await expect(page.locator("#gate")).toHaveText("false");
  await set(page, { config: { haptics: {} } });
  await expect(page.locator("#gate")).toHaveText("true");
  const result = await log(page);
  expect(result.calls).toEqual([1, 2]);
  expect(result.commits.at(-1)).toEqual({
    asset: "A",
    projectId: "p2",
    ownerId: "o1",
    accepted: true,
  });
});

test("read-only viewers stay gated until they can write, then commit once", async ({ page }) => {
  await mount(page);
  await set(page, { writable: false, accept: true });
  await settle(page, 1, true);
  await expect
    .poll(async () => (await log(page)).errors)
    .toEqual(["Open this project for editing to restore this animation's default haptics."]);
  expect((await log(page)).commits).toEqual([]);
  await expect(page.locator("#gate")).toHaveText("false");
  await set(page, { writable: true });
  await expect.poll(async () => (await log(page)).commits.length).toBe(1);
  await set(page, { config: { haptics: {} } });
  await expect(page.locator("#gate")).toHaveText("true");
});

test("unknown bytes open once verified and stay open across writer and owner changes", async ({
  page,
}) => {
  await mount(page);
  await settle(page, 1, false);
  await expect(page.locator("#gate")).toHaveText("true");
  await set(page, { writable: false });
  await set(page, { writable: true });
  await expect(page.locator("#gate")).toHaveText("true");
  const result = await log(page);
  expect(result.gates).toEqual([
    { asset: "A", gate: false },
    { asset: "A", gate: true },
  ]);
  expect(result.commits).toEqual([]);
  expect(result.errors).toEqual([]);
  expect(result.calls).toEqual([1]);
});

test("explicit config, custom maps, missing owners and inactive owners never verify or commit", async ({
  page,
}) => {
  await mount(page);
  await set(page, { asset: "C", config: { haptics: {} } });
  await expect(page.locator("#gate")).toHaveText("true");
  await set(page, { config: undefined, hasCustomMap: true });
  await expect(page.locator("#gate")).toHaveText("true");
  await set(page, { hasCustomMap: false, ownerId: null });
  await expect(page.locator("#gate")).toHaveText("true");
  await set(page, { ownerId: "o1", active: false });
  await expect(page.locator("#gate")).toHaveText("false");
  await page.waitForTimeout(200);
  const result = await log(page);
  expect(result.calls).toEqual([1]);
  expect(result.commits).toEqual([]);
});
