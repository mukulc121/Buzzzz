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
const animation = { durationMs: 4000, frameMs: 50, frames: frames.map((f) => ({ timeMs: f.timeMs, energy: f.rms })), impacts: [{ timeMs: 900, strength: 1, momentum: 1 }], warnings: [] };
function Harness() {
  const [viewport, setViewport] = React.useState({ startMs: 1000, durationMs: 1000 });
  const [range, setRange] = React.useState(null);
  const [playhead, setPlayhead] = React.useState(0);
  const [begins, setBegins] = React.useState(0);
  const [instance, setInstance] = React.useState("A");
  const [shorterMedia, setShorterMedia] = React.useState(false);
  const [markers, setMarkers] = React.useState([{ id: "cue", time: 2000, label: "Cue" }]);
  return React.createElement("div", null,
    React.createElement(TimelinePanel, { instanceKey: "project:" + instance, pattern, viewport, onViewChange: setViewport, range, onRangeChange: setRange, playhead, onScrub: setPlayhead, markers, onMarkerMove: (id, time) => setMarkers((items) => items.map((item) => item.id === id ? { ...item, time } : item)), audio: shorterMedia ? null : audio, durationMs: shorterMedia ? 1500 : 3000, animation: shorterMedia ? null : animation, onBegin: () => setBegins((n) => n + 1), onZoom: (f) => setViewport((v) => ({ ...v, durationMs: v.durationMs * f })), onFit: () => setViewport({ startMs: 0, durationMs: 4000 }) }),
    React.createElement("button", { onClick: () => setInstance((value) => value === "A" ? "B" : "A") }, "Switch timeline instance"),
    React.createElement("button", { onClick: () => setShorterMedia((value) => !value) }, "Toggle media duration"),
    React.createElement("output", { id: "timeline-state", style: { display: "block", overflowWrap: "anywhere" } }, JSON.stringify({ viewport, range, playhead, begins, markers }))
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
    const pan = page.getByRole("slider", { name: "Timeline view position", exact: true });
    const viewStart = page.getByRole("slider", { name: "Timeline view start", exact: true });
    const viewEnd = page.getByRole("slider", { name: "Timeline view end", exact: true });

    await drag(page, pan, 40);
    let current = await state(page);
    expect(current.viewport.durationMs).toBe(1000);
    expect(Math.abs(current.viewport.startMs - (1000 + 40 * msPerPx))).toBeLessThan(msPerPx * 2);

    await drag(page, viewEnd, -2000);
    current = await state(page);
    expect(current.viewport.durationMs).toBe(20);
    await drag(page, viewStart, -2000, 0.1);
    current = await state(page);
    expect(current.viewport.startMs).toBe(0);

    await viewEnd.focus();
    await page.keyboard.press("End");
    await expect(viewEnd).toHaveAttribute("aria-valuenow", "4000");
    await page.keyboard.press("Shift+ArrowLeft");
    await expect(viewEnd).toHaveAttribute("aria-valuenow", "3900");
    expect(current.begins).toBe(0);

    const rangeEnd = page.getByRole("slider", { name: "Playback range end", exact: true });
    await expect(rangeEnd).toHaveAttribute("aria-valuenow", "4000");
    await drag(page, rangeEnd, -40);
    current = await state(page);
    expect(current.begins).toBe(1);
    expect(Math.abs(current.range.end - (4000 - 40 * msPerPx))).toBeLessThan(msPerPx * 2);
    const rangeStart = page.getByRole("slider", { name: "Playback range start", exact: true });
    await rangeStart.focus();
    await page.keyboard.press("ArrowRight");
    expect((await state(page)).range.start).toBe(10);
    expect((await state(page)).begins).toBe(2);

    const lanes = page.getByRole("slider", { name: "Playback position", exact: true });
    const cursor = page.getByRole("slider", { name: "Scrub position", exact: true });
    const cursorBox = await box(cursor);
    await drag(page, cursor, trackBox.width / 4);
    expect(Math.abs((await state(page)).playhead - 1000)).toBeLessThan(msPerPx * 2);
    await drag(page, cursor, trackBox.width / 4);
    expect(Math.abs((await state(page)).playhead - 2000)).toBeLessThan(msPerPx * 2);
    expect(cursorBox.width).toBeGreaterThan(0);
    await drag(page, cursor, trackBox.width * 2);
    expect((await state(page)).playhead).toBe(4000);

    const before = (await state(page)).viewport;
    const panBox = await box(pan);
    await page.mouse.move(panBox.x + panBox.width / 4, panBox.y + panBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(panBox.x + panBox.width / 4 + 30, panBox.y + panBox.height / 2, {
      steps: 3,
    });
    expect((await state(page)).viewport).not.toEqual(before);
    await pan.dispatchEvent("pointercancel", { pointerId: 1, bubbles: true });
    await page.mouse.up();
    expect((await state(page)).viewport).toEqual(before);

    const marker = page.getByRole("slider", { name: "Marker Cue", exact: true });
    await marker.click();
    expect((await state(page)).playhead).toBe(4000);
    await drag(page, marker, trackBox.width / 8);
    await expect(marker).toHaveAttribute("aria-valuenow", "2500");
    expect((await state(page)).begins).toBe(3);
    await marker.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(marker).toHaveAttribute("aria-valuenow", "2490");
    await cursor.focus();
    await page.keyboard.press("Home");
    await lanes.focus();
    await page.keyboard.press("ArrowRight");
    expect((await state(page)).playhead).toBe(10);

    await expect(page.getByRole("img", { name: "Audio waveform" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Motion energy" })).toBeVisible();
    await expect(page.locator(".timeline-wave").first()).toHaveAttribute("y1", /\d/);
    await page.getByRole("button", { name: "Hide timeline", exact: true }).click();
    await expect(page.getByRole("img", { name: "Motion energy" })).toHaveCount(0);
    await page.getByRole("button", { name: "Show timeline", exact: true }).click();
    await expect(page.getByRole("img", { name: "Motion energy" })).toBeVisible();
    await expect(page.locator(".timeline-span-view .timeline-span-pan").last()).toHaveCSS(
      "touch-action",
      "none",
    );
    expect(errors).toEqual([]);
  });

test("timeline restores each instance without writing hydration clamps into saved windows", async ({
  page,
}) => {
  await mount(page, 1280);
  const initial = await state(page);
  const zoom = page.getByRole("button", { name: "Zoom timeline in", exact: true });
  const switchInstance = page.getByRole("button", {
    name: "Switch timeline instance",
    exact: true,
  });
  const thumb = page.getByRole("slider", { name: "Timeline scroll position", exact: true });
  await zoom.click();
  await zoom.click();
  await thumb.focus();
  await page.keyboard.press("End");
  const firstWindow = {
    start: await thumb.getAttribute("aria-valuenow"),
    max: await thumb.getAttribute("aria-valuemax"),
  };
  await switchInstance.click();
  await expect(thumb).toHaveCount(0);
  await zoom.click();
  await thumb.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await expect(thumb).toHaveAttribute("aria-valuenow", "10");
  const secondMax = await thumb.getAttribute("aria-valuemax");
  await switchInstance.click();
  await expect(thumb).toHaveAttribute("aria-valuenow", firstWindow.start ?? "");
  await expect(thumb).toHaveAttribute("aria-valuemax", firstWindow.max ?? "");
  await page.getByRole("button", { name: "Toggle media duration", exact: true }).click();
  await expect(thumb).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle media duration", exact: true }).click();
  await expect(thumb).toHaveAttribute("aria-valuenow", firstWindow.start ?? "");
  await expect(thumb).toHaveAttribute("aria-valuemax", firstWindow.max ?? "");
  await switchInstance.click();
  await expect(thumb).toHaveAttribute("aria-valuenow", "10");
  await expect(thumb).toHaveAttribute("aria-valuemax", secondMax ?? "");
  await thumb.dispatchEvent("wheel", { deltaX: 30, deltaY: 0, bubbles: true, cancelable: true });
  expect(Number(await thumb.getAttribute("aria-valuenow"))).toBeGreaterThan(10);
  await switchInstance.click();
  await expect(thumb).toHaveAttribute("aria-valuenow", firstWindow.start ?? "");
  expect(await state(page)).toEqual(initial);
});

for (const width of [320, 1280])
  test(`timeline source flags and independent scrollbar at ${width}px`, async ({ page }) => {
    await mount(page, width);
    const initial = await state(page);
    const lanes = page.locator(".timeline-lane");
    const finalLane = await box(lanes.last());
    const rangeStart = page.getByRole("slider", { name: "Playback range start", exact: true });
    const rangeEnd = page.getByRole("slider", { name: "Playback range end", exact: true });
    const flags = await rangeStart.evaluate((element) => {
      const flag = getComputedStyle(element, "::after");
      const line = getComputedStyle(element, "::before");
      return {
        width: flag.width,
        height: flag.height,
        shape: flag.clipPath,
        lineWidth: line.width,
        lineHeight: parseFloat(line.height),
        lineTop: element.getBoundingClientRect().top,
      };
    });
    expect(flags.width).toBe("11px");
    expect(flags.height).toBe("11px");
    expect(flags.shape).toBe("polygon(0px 0px, 100% 0px, 100% 54.5454%, 0px 100%)");
    expect(flags.lineWidth).toBe("2px");
    expect(flags.lineTop).toBeCloseTo(finalLane.y - 11, 1);
    expect(flags.lineHeight).toBeCloseTo(finalLane.height + 14, 1);
    expect(
      await rangeEnd.evaluate((element) => getComputedStyle(element, "::after").clipPath),
    ).toBe("polygon(100% 0px, 0px 0px, 0px 54.5454%, 100% 100%)");
    await expect(
      page.getByRole("slider", { name: "Playback range position", exact: true }),
    ).toHaveCount(0);

    const thumb = page.getByRole("slider", { name: "Timeline scroll position", exact: true });
    await expect(thumb).toHaveCount(0);
    await page.getByRole("button", { name: "Zoom timeline in", exact: true }).click();
    await expect(thumb).toBeVisible();
    const scroll = await box(page.locator(".timeline-scrollbar"));
    const thumbBox = await box(thumb);
    expect(scroll.y).toBeCloseTo(finalLane.y + finalLane.height + 5, 1);
    expect(scroll.height).toBe(4);
    expect(thumbBox.height).toBe(4);
    expect(thumbBox.width).toBeCloseTo(scroll.width / 1.15, 1);
    await expect(thumb).toHaveCSS("background-color", "rgb(43, 133, 171)");
    await drag(page, thumb, scroll.width * 2);
    const maxStart = Number(await thumb.getAttribute("aria-valuemax"));
    expect(Number(await thumb.getAttribute("aria-valuenow"))).toBeCloseTo(maxStart, 5);
    expect((await box(thumb)).x + (await box(thumb)).width).toBeCloseTo(scroll.x + scroll.width, 1);
    expect(await state(page)).toEqual(initial);

    await thumb.focus();
    await page.keyboard.press("Home");
    await expect(thumb).toHaveAttribute("aria-valuenow", "0");
    await page.keyboard.press("ArrowRight");
    await expect(thumb).toHaveAttribute("aria-valuenow", "10");
    const origin = await box(thumb);
    await page.mouse.move(origin.x + origin.width / 2, origin.y + 2);
    await page.mouse.down();
    await page.mouse.move(origin.x + origin.width / 2 + 20, origin.y + 2, { steps: 3 });
    expect(Number(await thumb.getAttribute("aria-valuenow"))).toBeGreaterThan(10);
    await thumb.dispatchEvent("pointercancel", { pointerId: 1, bubbles: true });
    await page.mouse.up();
    await expect(thumb).toHaveAttribute("aria-valuenow", "10");
    for (let index = 0; index < 40; index++)
      await page.getByRole("button", { name: "Zoom timeline in", exact: true }).click();
    expect((await box(thumb)).width).toBe(12);
    await thumb.focus();
    await page.keyboard.press("End");
    await expect(thumb).toHaveAttribute("aria-valuenow", "3980");
    expect(await state(page)).toEqual(initial);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
