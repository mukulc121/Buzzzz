import { expect, test } from "bun:test";
import { StackRouter } from "expo-router/build/react-navigation/routers/StackRouter";
import { claimSceneOwner, claimSceneRef } from "../src/features/playback/sceneOwnership";
import { showPreview } from "../src/features/shell/showPreview";

const routeNames = ["(tabs)", "mediaLibraryModal"];
const options = { routeNames, routeParamList: {}, routeGetIdList: {} };
const router = StackRouter({});
const modalOverTabs = router.getRehydratedState(
  { routes: [{ name: "(tabs)" }, { name: "mediaLibraryModal" }], index: 1 },
  options,
);
const toPreview = { name: "(tabs)", params: { screen: "preview" } };

test("leaving a root modal for Preview reuses the one tab navigator", () => {
  const replaced = router.getStateForAction(
    modalOverTabs,
    { type: "REPLACE", target: modalOverTabs.key, payload: toPreview },
    options,
  );
  const popped = router.getStateForAction(
    modalOverTabs,
    { type: "POP_TO", target: modalOverTabs.key, payload: toPreview },
    options,
  );
  expect(replaced?.routes.map((route) => route.name)).toEqual(["(tabs)", "(tabs)"]);
  expect(popped?.routes.map((route) => route.key)).toEqual([modalOverTabs.routes[0].key]);
  expect(popped?.routes[0].params).toEqual({ screen: "preview" });
});

test("Preview opens with dismissTo from a root modal and navigate inside tabs", () => {
  const calls: string[] = [];
  const spy = {
    navigate: (href: unknown) => calls.push(`navigate ${String(href)}`),
    dismissTo: (href: unknown) => calls.push(`dismissTo ${String(href)}`),
  };
  showPreview(spy, ["mediaLibraryModal"]);
  showPreview(spy, ["(tabs)", "demos", "buttons-demo"]);
  expect(calls).toEqual(["dismissTo /preview", "navigate /preview"]);
});

test("a hidden scene's stale release leaves the visible scene's fire handle alone", () => {
  const idle = () => "idle";
  const ref = { current: idle };
  const visible = () => "visible";
  const releaseOld = claimSceneRef(ref, () => "old", idle);
  const releaseVisible = claimSceneRef(ref, visible, idle);
  releaseOld();
  expect(ref.current).toBe(visible);
  releaseVisible();
  expect(ref.current).toBe(idle);
});

test("a hidden duplicate scene never takes haptics ownership from the visible one", () => {
  const ref: { current: { live: boolean } | null } = { current: null };
  const visible = { live: false };
  const hidden = { live: false };
  const next = { live: false };
  const releaseVisible = claimSceneOwner(ref, visible, false);
  expect(ref.current).toBe(visible);
  claimSceneOwner(ref, hidden, false);
  expect(ref.current).toBe(visible);
  claimSceneOwner(ref, hidden, true);
  expect(ref.current).toBe(hidden);
  claimSceneOwner(ref, visible, true);
  releaseVisible();
  claimSceneOwner(ref, next, false);
  expect(ref.current).toBe(next);
});
