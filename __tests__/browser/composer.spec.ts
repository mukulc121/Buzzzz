import { expect, test, type Page } from "@playwright/test";

const harness = `
import * as ReactModule from "/node_modules/.vite/deps/react.js";
import * as DOMModule from "/node_modules/.vite/deps/react-dom_client.js";
import { Chart } from "/src/features/composer/Chart.tsx";
const React = ReactModule.default ?? ReactModule;
const { createRoot } = DOMModule.default ?? DOMModule;
function Harness() {
  const [pattern, setPattern] = React.useState({ discretePattern: [{ time: 700, amplitude: 0.8, frequency: 0.35 }], continuousPattern: { amplitude: [{ time: 200, value: 0.3 }, { time: 400, value: 0.6 }], frequency: [{ time: 600, value: 0.4 }] } });
  const [selection, setSelection] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [viewport, setViewport] = React.useState({ startMs: 0, durationMs: 1000 });
  const [playhead, setPlayhead] = React.useState(900);
  const [begins, setBegins] = React.useState(0);
  const [layers, setLayers] = React.useState(["amplitude", "frequency", "discrete"]);
  const [error, setError] = React.useState("");
  return React.createElement("div", null,
    React.createElement("button", { onClick: () => setLayers(["amplitude"]) }, "Hide frequency and taps"),
    React.createElement(Chart, { pattern, layer: "amplitude", viewMs: viewport.durationMs, viewStartMs: viewport.startMs, onViewChange: setViewport, playhead, onScrub: setPlayhead, selected, onSelect: setSelected, selection, onSelectionChange: setSelection, visibleLayers: layers, snapMs: 25, onBegin: () => setBegins((n) => n + 1), onChange: setPattern, onError: setError, analysisCurves: [{ id: "audio", label: "Audio envelope", color: "rgba(10, 80, 180, 1)", points: [{ time: 0, value: 0.2 }, { time: 1000, value: 0.8 }] }], markers: [{ id: "cue", time: 500, label: "Cue" }], playbackRange: { start: 100, end: 800 } }),
    React.createElement("output", { id: "composer-state" }, JSON.stringify({ pattern, selection, viewport, playhead, begins, error }))
  );
}
const container = document.createElement("div");
container.id = "composer-harness";
document.getElementById("root").style.display = "none";
document.body.append(container);
createRoot(container).render(React.createElement(Harness));
`;

async function mount(page: Page) {
  await page.setViewportSize({ width: 1100, height: 700 });
  const entry = await (await page.request.get("/src/main.tsx")).text();
  const react = entry.match(/from "([^"]*\/react\.js\?[^"]*)"/)?.[1];
  const dom = entry.match(/from "([^"]*\/react-dom_client\.js\?[^"]*)"/)?.[1];
  if (!react || !dom) throw new Error("Missing Vite React modules");
  await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: harness
        .replace("/node_modules/.vite/deps/react.js", react)
        .replace("/node_modules/.vite/deps/react-dom_client.js", dom),
    }),
  );
  await page.goto("/");
  await page.addStyleTag({
    content:
      "#composer-harness { padding: 20px; } #composer-harness .chart { width: 800px; height: 320px; display: block; }",
  });
  await expect(page.locator("#composer-state")).toBeVisible();
}

async function state(page: Page) {
  const text = await page.locator("#composer-state").textContent();
  return JSON.parse(text ?? "{}");
}

test("multi-selection keyboard edits preserve history boundaries and tap payloads", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mount(page);
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  await chart
    .getByRole("button", { name: "Intensity point at 200 milliseconds, 30 percent", exact: true })
    .click();
  await chart
    .getByRole("button", { name: "Tap at 700 milliseconds, 80 percent intensity", exact: true })
    .click({ modifiers: ["Shift"] });
  expect((await state(page)).selection).toHaveLength(2);
  await page.keyboard.press("ArrowRight");
  let current = await state(page);
  expect(current.pattern.continuousPattern.amplitude[0].time).toBe(225);
  expect(current.pattern.discretePattern[0]).toEqual({
    time: 725,
    amplitude: 0.8,
    frequency: 0.35,
  });
  expect(current.begins).toBe(1);
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  current = await state(page);
  expect(current.pattern.continuousPattern.amplitude.at(-1).time).toBe(900);
  expect(current.pattern.discretePattern.at(-1)).toEqual({
    time: 1400,
    amplitude: 0.8,
    frequency: 0.35,
  });
  expect(current.begins).toBe(2);
  await chart.focus();
  await page.keyboard.press("Delete");
  current = await state(page);
  expect(current.pattern.discretePattern).toHaveLength(1);
  expect(current.pattern.continuousPattern.amplitude).toHaveLength(2);
  expect(current.selection).toEqual([]);
  expect(current.begins).toBe(3);
  expect(errors).toEqual([]);
});

test("box selection, layer visibility, scrub, zoom and pan use the controlled viewport", async ({
  page,
}) => {
  await mount(page);
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  await expect(chart.getByRole("img", { name: "Audio envelope", exact: true })).toBeAttached();
  const bounds = await chart.boundingBox();
  if (!bounds) throw new Error("Missing chart bounds");
  await page.mouse.move(bounds.x + 140, bounds.y + 100);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 360, bounds.y + 230, { steps: 8 });
  await page.mouse.up();
  expect((await state(page)).selection).toEqual([
    { layer: "amplitude", index: 0 },
    { layer: "amplitude", index: 1 },
  ]);
  await page.getByRole("button", { name: "Hide frequency and taps" }).click();
  await expect(chart.getByRole("button", { name: /^Frequency|^Tap/ })).toHaveCount(0);
  await chart.click({ position: { x: 400, y: 310 } });
  expect((await state(page)).playhead).toBe(500);
  const slider = chart.getByRole("slider", { name: "Playback position" });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "525");
  await page.mouse.move(bounds.x + 400, bounds.y + 150);
  await page.mouse.wheel(0, -150);
  await expect.poll(async () => (await state(page)).viewport.durationMs).toBeLessThan(1000);
  const zoomed = (await state(page)).viewport;
  expect(zoomed.startMs + zoomed.durationMs / 2).toBeCloseTo(500, 3);
  await page.keyboard.down("Alt");
  await page.mouse.move(bounds.x + 650, bounds.y + 150);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 570, bounds.y + 150, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  expect((await state(page)).viewport.startMs).toBeGreaterThan(zoomed.startMs);
  expect((await state(page)).begins).toBe(0);
});

test("group dragging starts one history entry and preserves selected spacing", async ({ page }) => {
  await mount(page);
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const first = chart.getByRole("button", {
    name: "Intensity point at 200 milliseconds, 30 percent",
    exact: true,
  });
  await first.click();
  await chart
    .getByRole("button", { name: "Intensity point at 400 milliseconds, 60 percent", exact: true })
    .click({ modifiers: ["Shift"] });
  const bounds = await first.boundingBox();
  if (!bounds) throw new Error("Missing point bounds");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 74.4, bounds.y + bounds.height / 2 - 26.4, {
    steps: 10,
  });
  await page.mouse.up();
  const current = await state(page);
  expect(
    current.pattern.continuousPattern.amplitude.map((point: { time: number }) => point.time),
  ).toEqual([300, 500]);
  expect(
    current.pattern.continuousPattern.amplitude[1].value -
      current.pattern.continuousPattern.amplitude[0].value,
  ).toBeCloseTo(0.3);
  expect(current.begins).toBe(1);
});
