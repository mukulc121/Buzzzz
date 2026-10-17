import { expect, test, type Page } from "@playwright/test";

const harness = `
import * as ReactModule from "/node_modules/.vite/deps/react.js";
import * as DOMModule from "/node_modules/.vite/deps/react-dom_client.js";
import { Chart } from "/src/features/composer/Chart.tsx";
const React = ReactModule.default ?? ReactModule;
const { createRoot } = DOMModule.default ?? DOMModule;
function Harness() {
  const [viewport, setViewport] = React.useState({ startMs: 1000, durationMs: 2000 });
  const [selection, setSelection] = React.useState(null);
  const [begins, setBegins] = React.useState(0);
  const [changes, setChanges] = React.useState(0);
  const pattern = { discretePattern: [], continuousPattern: { amplitude: [{ time: 1200, value: 0.3 }], frequency: [] } };
  return React.createElement("div", null,
    React.createElement(Chart, { pattern, layer: "amplitude", viewMs: viewport.durationMs, viewStartMs: viewport.startMs, onViewChange: setViewport, markerDurationMs: 5000, playhead: null, selected: selection, onSelect: setSelection, onBegin: () => setBegins((n) => n + 1), onChange: () => setChanges((n) => n + 1) }),
    React.createElement("output", { id: "chart-view" }, JSON.stringify(viewport)),
    React.createElement("output", { id: "chart-edits" }, JSON.stringify({ begins, changes }))
  );
}
createRoot(document.getElementById("root")).render(React.createElement(Harness));
`;

async function mount(page: Page) {
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
  await page.addStyleTag({ content: ".chart { width: 800px; height: 320px; display: block; }" });
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  await expect(chart).toHaveAttribute("viewBox", "0 0 800 320");
  return chart;
}

async function viewport(page: Page) {
  return page.locator("#chart-view").evaluate((element) => {
    const value: unknown = JSON.parse(element.textContent ?? "{}");
    if (
      !value ||
      typeof value !== "object" ||
      !("startMs" in value) ||
      !("durationMs" in value) ||
      typeof value.startMs !== "number" ||
      typeof value.durationMs !== "number"
    )
      throw new Error("Invalid chart viewport");
    return { startMs: value.startMs, durationMs: value.durationMs };
  });
}

test("plain wheel scrolls time along the dominant axis without editing the pattern", async ({
  page,
}) => {
  const chart = await mount(page);
  const bounds = await chart.boundingBox();
  if (!bounds) throw new Error("Missing chart bounds");
  await page.mouse.move(bounds.x + 414, bounds.y + 150);
  const shift = (70 / 708) * 2000;
  await page.mouse.wheel(0, 70);
  await expect.poll(async () => (await viewport(page)).startMs).toBeCloseTo(1000 + shift, 6);
  expect((await viewport(page)).durationMs).toBe(2000);
  await page.mouse.wheel(-140, 70);
  await expect.poll(async () => (await viewport(page)).startMs).toBeCloseTo(1000 - shift, 6);
  await chart.dispatchEvent("wheel", {
    deltaX: -70,
    deltaY: 70,
    deltaMode: 1,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
  await expect.poll(async () => (await viewport(page)).startMs).toBeCloseTo(1000, 6);
  await expect(page.locator("#chart-edits")).toHaveText('{"begins":0,"changes":0}');
});

for (const modifier of ["Control", "Meta"] as const) {
  test(`${modifier}+wheel zooms at the pointer using the fixed source step`, async ({ page }) => {
    const chart = await mount(page);
    const bounds = await chart.boundingBox();
    if (!bounds) throw new Error("Missing chart bounds");
    await page.mouse.move(bounds.x + 237, bounds.y + 150);
    await page.keyboard.down(modifier);
    await page.mouse.wheel(0, -150);
    await page.keyboard.up(modifier);
    await expect.poll(async () => (await viewport(page)).durationMs).toBeCloseTo(2000 / 1.15, 6);
    const zoomed = await viewport(page);
    expect(zoomed.startMs + zoomed.durationMs * 0.25).toBeCloseTo(1500, 6);
    await page.keyboard.down(modifier);
    await page.mouse.wheel(0, 1);
    await page.keyboard.up(modifier);
    await expect.poll(async () => (await viewport(page)).durationMs).toBeCloseTo(2000, 6);
    expect((await viewport(page)).startMs).toBeCloseTo(1000, 6);
    await expect(page.locator("#chart-edits")).toHaveText('{"begins":0,"changes":0}');
  });
}

test("middle-drag pans across the axis while Alt-left retains marquee behavior", async ({
  page,
}) => {
  const chart = await mount(page);
  const bounds = await chart.boundingBox();
  if (!bounds) throw new Error("Missing chart bounds");
  await page.mouse.move(bounds.x + 414, bounds.y + 310);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(bounds.x + 344, bounds.y + 310, { steps: 5 });
  await page.mouse.up({ button: "middle" });
  const panned = 1000 + (70 / 708) * 2000;
  expect((await viewport(page)).startMs).toBeCloseTo(panned, 6);
  await page.keyboard.down("Alt");
  await page.mouse.move(bounds.x + 500, bounds.y + 100);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 400, bounds.y + 200, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  expect((await viewport(page)).startMs).toBeCloseTo(panned, 6);
  await chart.dispatchEvent("wheel", { deltaY: 99999, bubbles: true, cancelable: true });
  await expect.poll(async () => (await viewport(page)).startMs).toBe(4600);
  expect((await viewport(page)).durationMs).toBe(2000);
  await chart.dispatchEvent("wheel", { deltaY: -99999, bubbles: true, cancelable: true });
  await expect.poll(async () => (await viewport(page)).startMs).toBe(0);
  await expect(page.locator("#chart-edits")).toHaveText('{"begins":0,"changes":0}');
});

test("modifier wheel remains active during middle-pan and the next movement keeps its zoom", async ({
  page,
}) => {
  const chart = await mount(page);
  const bounds = await chart.boundingBox();
  if (!bounds) throw new Error("Missing chart bounds");
  await page.mouse.move(bounds.x + 414, bounds.y + 150);
  await page.mouse.down({ button: "middle" });
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -1);
  await page.keyboard.up("Control");
  const durationMs = 2000 / 1.15;
  await expect.poll(async () => (await viewport(page)).durationMs).toBeCloseTo(durationMs, 6);
  await page.mouse.move(bounds.x + 344, bounds.y + 150, { steps: 5 });
  await page.mouse.up({ button: "middle" });
  const moved = await viewport(page);
  expect(moved.durationMs).toBeCloseTo(durationMs, 6);
  expect(moved.startMs).toBeCloseTo(1000 + (70 / 708) * durationMs, 6);
  await expect(page.locator("#chart-edits")).toHaveText('{"begins":0,"changes":0}');
});

test("Settings describes the implemented source mouse gestures", async ({ page }) => {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const mouse = page.locator(".settings-shortcuts").last();
  await expect(mouse.locator("li > span")).toHaveText([
    "Add a point on the active layer",
    "Marquee-select",
    "Move a point",
    "Pan",
    "Scroll through time",
    "Zoom at the pointer",
  ]);
  const modifier = await page.evaluate(() =>
    /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘" : "Ctrl",
  );
  await expect(mouse.locator("kbd")).toHaveText([
    "Double-click",
    "Drag",
    "Drag a point",
    "Middle-drag",
    "Wheel",
    `${modifier} + wheel`,
  ]);
});
