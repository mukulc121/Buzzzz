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
  const [markers, setMarkers] = React.useState([{ id: "cue", time: 500, label: "Cue" }]);
  return React.createElement("div", null,
    React.createElement("button", { onClick: () => setLayers(["amplitude"]) }, "Hide frequency and taps"),
    React.createElement(Chart, { pattern, layer: "amplitude", viewMs: viewport.durationMs, viewStartMs: viewport.startMs, onViewChange: setViewport, playhead, onScrub: setPlayhead, selected, onSelect: setSelected, selection, onSelectionChange: setSelection, visibleLayers: layers, snapMs: 25, onBegin: () => setBegins((n) => n + 1), onChange: setPattern, onError: setError, analysisCurves: [{ id: "audio", label: "Audio envelope", color: "rgba(10, 80, 180, 1)", points: [{ time: 0, value: 0.2 }, { time: 1000, value: 0.8 }] }], markers, markerDurationMs: 1000, onMarkerMove: (id, time) => setMarkers((items) => items.map((item) => item.id === id ? { ...item, time } : item)), onMarkerRename: (id, label) => setMarkers((items) => items.map((item) => item.id === id ? { ...item, label } : item)), playbackRange: { start: 100, end: 800 } }),
    React.createElement("output", { id: "composer-state" }, JSON.stringify({ pattern, selection, viewport, playhead, begins, error, markers }))
  );
}
const container = document.createElement("div");
container.id = "composer-harness";
document.getElementById("root").style.display = "none";
document.body.append(container);
createRoot(container).render(React.createElement(Harness));
`;

async function mount(page: Page, playhead: number | null = 900) {
  await page.setViewportSize({ width: 1100, height: 700 });
  const entry = await (await page.request.get("/src/main.tsx")).text();
  const react = entry.match(/from "([^"]*\/react\.js\?[^"]*)"/)?.[1];
  const dom = entry.match(/from "([^"]*\/react-dom_client\.js\?[^"]*)"/)?.[1];
  if (!react || !dom) throw new Error("Missing Vite React modules");
  await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: harness
        .replace("React.useState(900)", `React.useState(${playhead})`)
        .replace("/node_modules/.vite/deps/react.js", react)
        .replace("/node_modules/.vite/deps/react-dom_client.js", dom),
    }),
  );
  await page.goto("/");
  for (const file of ["tokens", "composer", "chart-details"])
    await page.addStyleTag({ path: `apps/studio/src/styles/${file}.css` });
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
  const bounds = await chart.boundingBox();
  if (!bounds) throw new Error("Missing chart bounds");
  await page.mouse.move(bounds.x + 140, bounds.y + 50);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 580, bounds.y + 230, { steps: 8 });
  await page.mouse.up();
  expect((await state(page)).selection).toHaveLength(4);
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
  expect(current.pattern.continuousPattern.amplitude.at(-1).time).toBe(1100);
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
  await chart.click({ position: { x: 414, y: 310 } });
  expect((await state(page)).playhead).toBe(500);
  const slider = chart.getByRole("slider", { name: "Playback position" });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "525");
  await page.mouse.move(bounds.x + 414, bounds.y + 150);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -150);
  await page.keyboard.up("Control");
  await expect.poll(async () => (await state(page)).viewport.durationMs).toBeLessThan(1000);
  const zoomed = (await state(page)).viewport;
  expect(zoomed.startMs + zoomed.durationMs / 2).toBeCloseTo(500, 3);
  await page.mouse.move(bounds.x + 650, bounds.y + 150);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(bounds.x + 570, bounds.y + 150, { steps: 5 });
  await page.mouse.up({ button: "middle" });
  expect((await state(page)).viewport.startMs).toBeGreaterThan(zoomed.startMs);
  expect((await state(page)).begins).toBe(0);
});

test("grabbing a point replaces marquee selection and starts one history entry", async ({
  page,
}) => {
  await mount(page);
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const first = chart.getByRole("button", {
    name: "Intensity point at 200 milliseconds, 30 percent",
    exact: true,
  });
  const chartBounds = await chart.boundingBox();
  if (!chartBounds) throw new Error("Missing chart bounds");
  await page.mouse.move(chartBounds.x + 140, chartBounds.y + 100);
  await page.mouse.down();
  await page.mouse.move(chartBounds.x + 400, chartBounds.y + 230, { steps: 8 });
  await page.mouse.up();
  expect((await state(page)).selection).toHaveLength(2);
  const bounds = await first.boundingBox();
  if (!bounds) throw new Error("Missing point bounds");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 70.8, bounds.y + bounds.height / 2 - 27.2, {
    steps: 10,
  });
  await page.mouse.up();
  const current = await state(page);
  expect(
    current.pattern.continuousPattern.amplitude.map((point: { time: number }) => point.time),
  ).toEqual([300, 400]);
  expect(
    current.pattern.continuousPattern.amplitude[1].value -
      current.pattern.continuousPattern.amplitude[0].value,
  ).toBeCloseTo(0.2);
  expect(current.selection).toEqual([{ layer: "amplitude", index: 0 }]);
  expect(current.begins).toBe(1);
});

test("hover readouts track plot coordinates without editing and keep the initial cursor visible", async ({
  page,
}) => {
  await mount(page, null);
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const cursor = chart.getByRole("slider", { name: "Playback position" });
  await expect(cursor).toHaveAttribute("aria-valuenow", "0");
  await expect(cursor.locator("text")).toHaveText("0 ms");
  expect(await cursor.evaluate((element) => element.closest("[clip-path]"))).toBeNull();
  const before = await state(page);
  const bounds = await chart.boundingBox();
  if (!bounds) throw new Error("Missing chart bounds");
  const x = 60 + (bounds.width - 92) * 0.35;
  const y = 18 + (bounds.height - 48) * 0.75;
  await page.mouse.move(bounds.x + x, bounds.y + y);
  await expect(chart.locator(".chart-hover-time")).toHaveText("350 ms");
  await expect(chart.locator(".chart-hover-value")).toHaveText("25.0%");
  const crosshair = chart.locator(".chart-crosshair");
  await expect(crosshair).toHaveAttribute("aria-hidden", "true");
  for (const path of await crosshair.locator("path").all())
    await expect(path).toHaveAttribute("stroke-dasharray", "3 3");
  const coordinates = await crosshair.locator("path").evaluateAll((paths) =>
    paths.flatMap(
      (path) =>
        path
          .getAttribute("d")
          ?.match(/[\d.]+/g)
          ?.map(Number) ?? [],
    ),
  );
  expect(coordinates).toHaveLength(6);
  for (const [index, expected] of [x, 18, bounds.height - 30, 46, y, bounds.width - 18].entries())
    expect(coordinates?.[index]).toBeCloseTo(expected, 2);
  expect(await state(page)).toEqual(before);
  const frequency = chart.locator('polyline[data-envelope="frequency"]');
  const envelopeCoordinates = (await frequency.getAttribute("points"))?.split(/[ ,]+/).map(Number);
  expect(envelopeCoordinates).toHaveLength(2);
  for (const [index, expected] of [484.8, 181.2].entries())
    expect(envelopeCoordinates?.[index]).toBeCloseTo(expected, 5);
  await expect(chart.getByRole("button", { name: /^Frequency point/ })).toHaveCount(1);
  const point = chart.getByRole("button", {
    name: "Intensity point at 200 milliseconds, 30 percent",
    exact: true,
  });
  await point.hover();
  await expect(point).toHaveCSS("stroke-width", "3px");
  await expect(chart.locator(".chart-hover-time")).toHaveText("200 ms");
  await expect(chart.locator(".chart-hover-value")).toHaveText("30.0%");
  expect(await state(page)).toEqual(before);
  await page.mouse.move(bounds.x + 5, bounds.y + 5);
  await expect(crosshair).toHaveCount(0);
  expect(await state(page)).toEqual(before);
});

test("discrete bars retain their offsets when dragging and continuous curves stop before later taps", async ({
  page,
}) => {
  await mount(page);
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const event = chart.getByRole("button", { name: /^Tap at 700 milliseconds/ });
  const caps = event.locator("circle");
  const centers = await caps.evaluateAll((elements) =>
    elements.map((element) => Number(element.getAttribute("cx"))),
  );
  expect(centers[0] - centers[1]).toBe(15);
  const bar = event.locator(".tap-bar").first();
  const bounds = await bar.boundingBox();
  if (!bounds) throw new Error("Missing discrete bar bounds");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 70.8, bounds.y + bounds.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  const current = await state(page);
  expect(current.pattern.discretePattern[0]).toEqual({
    time: 800,
    amplitude: 0.8,
    frequency: 0.35,
  });
  expect(current.begins).toBe(1);
  const intensity = chart.locator('polyline[data-envelope="amplitude"]');
  const frequency = chart.locator('polyline[data-envelope="frequency"]');
  expect((await intensity.getAttribute("points"))?.split(" ").at(-1)?.split(",")[0]).toBe("484.8");
  expect((await frequency.getAttribute("points"))?.split(" ")).toHaveLength(1);
});

test("discrete intensity and frequency caps move independently on the value axis", async ({
  page,
}) => {
  await mount(page);
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const event = chart.locator(".tap-event");
  const caps = event.locator("circle");
  const frequency = await caps.first().boundingBox();
  if (!frequency) throw new Error("Missing frequency cap");
  await page.mouse.move(frequency.x + frequency.width / 2, frequency.y + frequency.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    frequency.x + frequency.width / 2 + 70.8,
    frequency.y + frequency.height / 2 - 27.2,
    { steps: 6 },
  );
  await page.mouse.up();
  expect((await state(page)).pattern.discretePattern[0]).toEqual({
    time: 700,
    amplitude: 0.8,
    frequency: 0.45,
  });
  const intensity = await caps.last().boundingBox();
  if (!intensity) throw new Error("Missing intensity cap");
  await page.mouse.move(intensity.x + intensity.width / 2, intensity.y + intensity.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    intensity.x + intensity.width / 2 - 70.8,
    intensity.y + intensity.height / 2 + 27.2,
    { steps: 6 },
  );
  await page.mouse.up();
  const current = await state(page);
  expect(current.pattern.discretePattern[0]).toEqual({
    time: 700,
    amplitude: 0.7,
    frequency: 0.45,
  });
  expect(current.begins).toBe(2);
});

test("crosshair and cursor labels fit the canvas at the plot edges in both themes", async ({
  page,
}) => {
  await mount(page);
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const bounds = await chart.boundingBox();
  if (!bounds) throw new Error("Missing chart bounds");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
    for (const x of [47, bounds.width - 19]) {
      await page.mouse.move(bounds.x + x, bounds.y + 19);
      const readouts = chart.locator(".chart-crosshair rect, [data-playhead] > rect:last-of-type");
      for (const label of await readouts.all()) {
        const rect = await label.boundingBox();
        if (!rect) throw new Error("Missing readout bounds");
        expect(rect.x).toBeGreaterThanOrEqual(bounds.x);
        expect(rect.x + rect.width).toBeLessThanOrEqual(bounds.x + bounds.width);
        expect(rect.height).toBe(14);
      }
    }
  }
  expect((await state(page)).begins).toBe(0);
});

test("chart markers drag within the preset and rename without drawing points or moving playback", async ({
  page,
}) => {
  await mount(page);
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const initial = await state(page);
  const marker = chart.getByRole("slider", { name: "Marker Cue", exact: true });
  const label = marker.locator("rect");
  const bounds = await label.boundingBox();
  if (!bounds) throw new Error("Missing marker label");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 70.8, bounds.y + bounds.height / 2, {
    steps: 6,
  });
  await page.mouse.up();
  await expect(marker).toHaveAttribute("aria-valuenow", "600");
  expect((await state(page)).begins).toBe(1);
  await label.dblclick();
  const input = chart.getByRole("textbox", { name: "Marker label", exact: true });
  await input.fill(" Landing ");
  await input.press("Enter");
  const renamed = chart.getByRole("slider", { name: "Marker Landing", exact: true });
  await expect(renamed).toHaveAttribute("aria-valuenow", "600");
  await renamed.locator("rect").dblclick();
  await input.fill("Cancelled");
  await input.press("Escape");
  await expect(renamed).toHaveAttribute("aria-valuenow", "600");
  await renamed.focus();
  await page.keyboard.press("End");
  await expect(renamed).toHaveAttribute("aria-valuenow", "1000");
  const current = await state(page);
  expect(current.pattern).toEqual(initial.pattern);
  expect(current.playhead).toBe(initial.playhead);
  expect(current.selection).toEqual([]);
  expect(current.begins).toBe(3);
});
