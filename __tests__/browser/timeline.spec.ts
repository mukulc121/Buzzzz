import { expect, test, type Locator, type Page } from "@playwright/test";

const harness = `
import * as ReactModule from "/node_modules/.vite/deps/react.js";
import * as DOMModule from "/node_modules/.vite/deps/react-dom_client.js";
import { TimelinePanel } from "/src/features/composer/TimelinePanel.tsx";
const React = ReactModule.default ?? ReactModule;
const { createRoot } = DOMModule.default ?? DOMModule;
const pattern = { discretePattern: [{ time: 700, amplitude: 0.8, frequency: 0.35 }], continuousPattern: { amplitude: [{ time: 0, value: 0.2 }, { time: 1500, value: 0.9 }], frequency: [{ time: 0, value: 0.5 }] } };
const frames = Array.from({ length: 31 }, (_, i) => ({ timeMs: i * 100, rms: Math.abs(Math.sin(i / 3)) }));
const audio = { frames, onsets: [{ timeMs: 1200, strength: 1 }], durationMs: 3000 };
const animation = { durationMs: 3500, frameMs: 50, frames: frames.map((f) => ({ timeMs: f.timeMs, energy: f.rms })), impacts: [{ timeMs: 900, strength: 1, momentum: 1 }], warnings: [] };
function Harness() {
  const [viewport, setViewport] = React.useState({ startMs: 1000, durationMs: 1000 });
  const [range, setRange] = React.useState(null);
  const [playhead, setPlayhead] = React.useState(0);
  const [begins, setBegins] = React.useState(0);
  return React.createElement("div", null,
    React.createElement(TimelinePanel, { pattern, viewport, onViewChange: setViewport, range, onRangeChange: setRange, playhead, onScrub: setPlayhead, markers: [{ id: "cue", time: 2000, label: "Cue" }], audio, durationMs: 3000, animation, onBegin: () => setBegins((n) => n + 1), onZoom: (f) => setViewport((v) => ({ ...v, durationMs: v.durationMs * f })), onFit: () => setViewport({ startMs: 0, durationMs: 4000 }) }),
    React.createElement("output", { id: "timeline-state" }, JSON.stringify({ viewport, range, playhead, begins }))
  );
}
const container = document.createElement("div");
container.id = "timeline-harness";
document.getElementById("root").style.display = "none";
document.body.append(container);
createRoot(container).render(React.createElement(Harness));
`;

async function mount(page: Page, width: number) {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.setViewportSize({ width, height: 700 });
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
  for (const file of ["tokens", "base", "composer", "timeline"])
    await page.addStyleTag({ path: `apps/studio/src/styles/${file}.css` });
  await expect(page.locator("#timeline-state")).toBeAttached();
}

async function state(page: Page) {
  return JSON.parse((await page.locator("#timeline-state").textContent()) ?? "{}");
}

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  if (!value) throw new Error("Element is not visible");
  return value;
}

async function drag(page: Page, locator: Locator, dx: number, x = 0.5) {
  const rect = await box(locator);
  const startX = rect.x + rect.width * x;
  const y = rect.y + rect.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + dx / 2, y, { steps: 3 });
  await page.mouse.move(startX + dx, y, { steps: 3 });
  await page.mouse.up();
}

for (const width of [320, 1280])
  test(`timeline drag, keyboard and lanes at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mount(page, width);
    const track = page.locator(".timeline-track");
    const trackBox = await box(track);
    expect(trackBox.x + trackBox.width).toBeLessThanOrEqual(width);
    const msPerPx = 4000 / trackBox.width;
    const pan = page.getByRole("slider", { name: "Timeline view position" });
    const viewStart = page.getByRole("slider", { name: "Timeline view start" });
    const viewEnd = page.getByRole("slider", { name: "Timeline view end" });

    await drag(page, pan, 40);
    let current = await state(page);
    expect(current.viewport.durationMs).toBe(1000);
    expect(Math.abs(current.viewport.startMs - (1000 + 40 * msPerPx))).toBeLessThan(msPerPx * 2);

    await drag(page, viewEnd, -2000);
    current = await state(page);
    expect(current.viewport.durationMs).toBe(100);
    await drag(page, viewStart, -2000);
    current = await state(page);
    expect(current.viewport.startMs).toBe(0);

    await viewEnd.focus();
    await page.keyboard.press("End");
    await expect(viewEnd).toHaveAttribute("aria-valuenow", "4000");
    await page.keyboard.press("Shift+ArrowLeft");
    await expect(viewEnd).toHaveAttribute("aria-valuenow", "3900");
    expect(current.begins).toBe(0);

    await page.getByRole("checkbox", { name: "Playback range" }).check();
    const rangeEnd = page.getByRole("slider", { name: "Playback range end" });
    await expect(rangeEnd).toHaveAttribute("aria-valuenow", "3500");
    await drag(page, rangeEnd, -40);
    current = await state(page);
    expect(current.begins).toBe(2);
    expect(Math.abs(current.range.end - (3500 - 40 * msPerPx))).toBeLessThan(msPerPx * 2);
    const rangeStart = page.getByRole("slider", { name: "Playback range start" });
    await rangeStart.focus();
    await page.keyboard.press("ArrowRight");
    expect((await state(page)).range.start).toBe(10);
    expect((await state(page)).begins).toBe(3);

    const lanes = page.getByRole("slider", { name: "Playback position" });
    const lanesBox = await box(lanes);
    await page.mouse.move(lanesBox.x + lanesBox.width / 4, lanesBox.y + 10);
    await page.mouse.down();
    expect(Math.abs((await state(page)).playhead - 1000)).toBeLessThan(msPerPx * 2);
    await page.mouse.move(lanesBox.x + lanesBox.width / 2, lanesBox.y + 10, { steps: 4 });
    expect(Math.abs((await state(page)).playhead - 2000)).toBeLessThan(msPerPx * 2);
    await page.mouse.move(lanesBox.x + lanesBox.width + 200, lanesBox.y + 10);
    expect((await state(page)).playhead).toBe(4000);
    await page.mouse.up();

    const before = (await state(page)).viewport;
    const panBox = await box(pan);
    await page.mouse.move(panBox.x + panBox.width / 2, panBox.y + panBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(panBox.x + panBox.width / 2 + 30, panBox.y + panBox.height / 2, {
      steps: 3,
    });
    expect((await state(page)).viewport).not.toEqual(before);
    await pan.dispatchEvent("pointercancel", { pointerId: 1, bubbles: true });
    await page.mouse.up();
    expect((await state(page)).viewport).toEqual(before);

    await page.getByRole("button", { name: "Seek to Cue at 2000 milliseconds" }).click();
    expect((await state(page)).playhead).toBe(2000);
    await lanes.focus();
    await page.keyboard.press("ArrowRight");
    expect((await state(page)).playhead).toBe(2010);

    await expect(page.getByRole("img", { name: "Audio waveform" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Motion energy" })).toBeVisible();
    await expect(page.locator(".timeline-wave")).toHaveAttribute("points", /\d/);
    await page.getByRole("button", { name: "Motion", exact: true }).click();
    await expect(page.getByRole("img", { name: "Motion energy" })).toHaveCount(0);
    await expect(page.locator(".timeline-span-view .timeline-span-pan")).toHaveCSS(
      "touch-action",
      "none",
    );
    expect(errors).toEqual([]);
  });
