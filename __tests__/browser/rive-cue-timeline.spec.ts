import { openRiveInspector } from "./fixtures/rive-controls";
import { expect, test, type Page } from "@playwright/test";
import { patternTitle } from "./fixtures/pattern-title";

async function openSample(page: Page) {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Create sample project", exact: true }).click();
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  await expect(chart).toHaveAttribute("data-readonly", "true");
  return chart;
}

test("the real Rive owner uses the normal Pulsar waveform chart without persisting a synthetic authored pattern", async ({
  page,
}, testInfo) => {
  const chart = await openSample(page);
  const readonlyChart = page.locator('.chart[data-readonly="true"]');
  const overview = page.getByRole("img", { name: "Pattern overview", exact: true });
  await expect(chart.locator("[data-pattern-segment]")).toHaveCount(3);
  await expect(chart.locator('[data-envelope="amplitude"]')).toHaveCount(3);
  await expect(chart.locator('[data-envelope="frequency"]')).toHaveCount(3);
  await expect(chart.locator(".tap-event")).toHaveCount(8);
  await expect(chart.locator("text").filter({ hasText: "100%" })).toHaveCount(1);
  await expect(chart.getByRole("button")).toHaveCount(0);
  await expect(overview.locator("[data-pattern-segment]")).toHaveCount(3);
  await expect(overview.locator(".timeline-tap")).toHaveCount(8);
  const width = await chart.evaluate((node) => node.clientWidth);
  const paths = await chart.locator('[data-envelope="frequency"]').evaluateAll((nodes) =>
    nodes.map((node) =>
      node
        .getAttribute("points")
        ?.split(" ")
        .map((point) => Number(point.split(",")[0])),
    ),
  );
  expect(paths[0]?.[0]).toBeCloseTo(60 + (400 / 4440) * (width - 92), 3);
  expect(paths[1]?.at(-1)).toBeCloseTo(60 + (3740 / 4440) * (width - 92), 3);
  expect(paths[2]?.[0]).toBeCloseTo(60 + (3940 / 4440) * (width - 92), 3);
  const timeline = page.getByRole("region", { name: "Timeline", exact: true });
  await expect(
    timeline.getByRole("slider", { name: "Playback range end", exact: true }),
  ).toHaveCount(0);
  await expect(timeline.getByRole("slider", { name: "Scrub position", exact: true })).toHaveCount(
    0,
  );
  await expect(
    timeline.getByRole("slider", { name: "Timeline view position", exact: true }),
  ).toBeVisible();
  await expect(timeline.locator(".timeline-ruler span").last()).toHaveText("4440 ms");
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  const inspector = page.getByRole("complementary", { name: "Inspector", exact: true });
  const rangeStart = inspector.getByRole("spinbutton", {
    name: "Playback range start",
    exact: true,
  });
  const rangeEnd = inspector.getByRole("spinbutton", { name: "Playback range end", exact: true });
  await expect(rangeStart).toHaveValue("0");
  await expect(rangeStart).not.toBeEditable();
  await expect(rangeEnd).toHaveValue("4440");
  await expect(rangeEnd).not.toBeEditable();
  await expect(inspector.getByRole("switch", { name: "Loop", exact: true })).toBeDisabled();
  const pattern = await page.evaluate(() => {
    const projectId = localStorage.getItem("buzzzz.lastProject");
    const record = JSON.parse(localStorage.getItem(`buzzzz.project.${projectId}`) ?? "null");
    return record.project.presets.find((preset: { id: string }) => preset.id === "dex-tour-loader")
      .pattern;
  });
  expect(pattern).toEqual({
    discretePattern: [],
    continuousPattern: { amplitude: [], frequency: [] },
  });
  await page.screenshot({ path: testInfo.outputPath("rive-source-waveform.png") });
  for (const name of ["ExplosionAnimation", "FanfareSound", "JustHaptics"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(patternTitle(page)).toHaveText(name);
    await expect(readonlyChart).toHaveCount(0);
    await expect(page.locator(".timeline-lanes [data-playhead][data-live]")).toHaveCount(0);
    await expect(
      page.getByRole("group", { name: "Haptic pattern timeline", exact: true }),
    ).toBeVisible();
    await expect(rangeStart).toBeEditable();
    await expect(rangeEnd).toBeEditable();
    await expect(inspector.getByRole("switch", { name: "Loop", exact: true })).toBeEnabled();
  }
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  await expect(readonlyChart.locator(".tap-event")).toHaveCount(8);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Create new project", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create project", exact: true });
  await dialog.getByRole("textbox", { name: "Project name", exact: true }).fill("No scripted Rive");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(readonlyChart).toHaveCount(0);
  await expect(page.locator(".timeline-lanes [data-playhead][data-live]")).toHaveCount(0);
});

test("the source clock drives both waveform cursors and pauses without turning the display into a seek control", async ({
  page,
}) => {
  test.setTimeout(30_000);
  const chart = await openSample(page);
  const panel = await openRiveInspector(page);
  await expect(panel.getByRole("button", { name: "Fire isLoaded", exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Play with haptics", exact: true }).click();
  const readonlyChart = page.locator('.chart[data-readonly="true"]');
  const cursor = chart.locator("[data-playhead]");
  const elapsed = async () => Number(await cursor.getAttribute("aria-valuenow"));
  await expect.poll(elapsed).toBeGreaterThan(100);
  await panel.getByRole("button", { name: "Pause", exact: true }).dispatchEvent("click");
  await expect(panel.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const paused = await elapsed();
  await page.waitForTimeout(250);
  expect(await elapsed()).toBe(paused);
  const overview = page.getByRole("img", { name: "Pattern overview", exact: true });
  await expect(overview.locator("[data-playhead]")).toHaveAttribute(
    "aria-valuenow",
    String(paused),
  );
  await panel.getByRole("button", { name: "Resume", exact: true }).dispatchEvent("click");
  await expect.poll(elapsed).toBeGreaterThan(paused + 100);
  await expect(cursor).toHaveAttribute("aria-disabled", "true");
  await chart.dblclick({ position: { x: 160, y: 100 } });
  await chart.focus();
  await chart.press("Delete");
  await expect(chart.locator(".tap-event")).toHaveCount(8);
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Pulsar Library", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search Pulsar presets", exact: true }).fill("alarm");
  await page.getByRole("button", { name: "Append Alarm to the pattern", exact: true }).click();
  await expect(readonlyChart).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "Haptic pattern timeline", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".timeline-lanes [data-playhead][data-live]")).toHaveCount(0);
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  const inspector = page.getByRole("complementary", { name: "Inspector", exact: true });
  await expect(
    inspector.getByRole("spinbutton", { name: "Playback range end", exact: true }),
  ).toBeEditable();
  await expect(inspector.getByRole("switch", { name: "Loop", exact: true })).toBeEnabled();
  await expect(chart.getByRole("button", { name: /^Tap at/ }).first()).toBeVisible();
});
