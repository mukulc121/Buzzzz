import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
});

test("inspector edits and deletes the selected event with undo", async ({ page }) => {
  await expect(page.getByText("Nothing selected.", { exact: true })).toBeVisible();
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const events = chart.getByRole("button", { name: /^Tap at/ });
  const before = await events.count();
  expect(before).toBeGreaterThan(0);
  await events.first().click();
  const intensity = page.getByRole("spinbutton", { name: "Selected intensity", exact: true });
  const original = await intensity.inputValue();
  await intensity.fill("64.3");
  await expect(
    page.getByRole("slider", { name: "Selected intensity slider", exact: true }),
  ).toHaveValue("64.3");
  await page.getByRole("button", { name: "Increase selected intensity", exact: true }).click();
  await expect(intensity).toHaveValue("64.4");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(intensity).toHaveValue("64.3");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(intensity).toHaveValue(original);
  await page.getByRole("button", { name: "Delete event", exact: true }).click();
  await expect(events).toHaveCount(before - 1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(events).toHaveCount(before);
});

test("playback range, markers and layer switches use real editor state", async ({ page }) => {
  const inspector = page.getByRole("complementary", { name: "Inspector", exact: true });
  await expect(
    inspector.getByText(
      "No markers yet. They annotate the timeline - they don't change what plays.",
      { exact: true },
    ),
  ).toBeVisible();
  await inspector.getByRole("radio", { name: "Edit frequency", exact: true }).check();
  await expect(inspector.locator('.inspector-layer[data-layer="frequency"]')).toHaveAttribute(
    "data-active",
    "true",
  );
  const show = inspector.getByRole("switch", { name: "Show frequency", exact: true });
  await show.uncheck();
  await expect(
    page
      .getByRole("group", { name: "Haptic pattern timeline", exact: true })
      .getByRole("button", { name: /^Frequency point/ }),
  ).toHaveCount(0);
  await show.check();
  await expect(
    inspector.getByRole("switch", { name: "Multilayer selection", exact: true }),
  ).toBeChecked();
  await inspector.getByRole("switch", { name: "Multilayer selection", exact: true }).uncheck();
  await inspector.getByRole("spinbutton", { name: "Playback range start", exact: true }).fill("10");
  await inspector.getByRole("spinbutton", { name: "Playback range end", exact: true }).fill("200");
  await inspector.getByRole("switch", { name: "Loop", exact: true }).check();
  await inspector.getByRole("button", { name: "Add marker at the cursor", exact: true }).click();
  await expect(inspector.getByRole("textbox", { name: "Marker label", exact: true })).toHaveValue(
    "Marker 1",
  );
  await inspector.getByRole("spinbutton", { name: "Marker time", exact: true }).fill("120");
  await page.reload();
  await expect(
    inspector.getByRole("spinbutton", { name: "Playback range start", exact: true }),
  ).toHaveValue("10");
  await expect(
    inspector.getByRole("spinbutton", { name: "Playback range end", exact: true }),
  ).toHaveValue("200");
  await expect(inspector.getByRole("textbox", { name: "Marker label", exact: true })).toHaveValue(
    "Marker 1",
  );
  await expect(inspector.getByRole("spinbutton", { name: "Marker time", exact: true })).toHaveValue(
    "120",
  );
  await inspector.getByRole("button", { name: "Play the whole preset", exact: true }).click();
  await expect(
    inspector.getByRole("button", { name: "Play the whole preset", exact: true }),
  ).toBeDisabled();
  await expect(
    inspector.getByRole("spinbutton", { name: "Playback range start", exact: true }),
  ).toHaveValue("0");
});

test("multilayer selection controls which layers are edited together", async ({ page }) => {
  const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
  const intensity = chart.getByRole("button", { name: /^Intensity point/ });
  const taps = chart.getByRole("button", { name: /^Tap at/ });
  const count = await intensity.count();
  await intensity.nth(1).click();
  await taps.first().click({ modifiers: ["Shift"] });
  await page.keyboard.press("Delete");
  await expect(intensity).toHaveCount(count - 1);
  await expect(taps).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("switch", { name: "Multilayer selection", exact: true }).uncheck();
  await taps.first().click();
  await intensity.nth(1).click({ modifiers: ["Shift"] });
  await page.keyboard.press("Delete");
  await expect(intensity).toHaveCount(count - 1);
  await expect(taps).toHaveCount(1);
});

test("selected-event controls are accessible in both themes", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page
    .getByRole("group", { name: "Haptic pattern timeline", exact: true })
    .getByRole("button", { name: /^Tap at/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  for (const theme of ["Light", "Dark"]) {
    await page.getByRole("radio", { name: theme, exact: true }).click();
    const scan = await new AxeBuilder({ page })
      .include(".workspace-inspector")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  }
});
