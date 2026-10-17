import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
});

test("settings labels and switch help expose the source copy without changing preferences", async ({
  page,
}) => {
  const settings = page.locator(".settings-panel");
  const theme = settings.getByRole("button", { name: "About Theme", exact: true });
  const density = settings.getByRole("button", { name: "About Grid density", exact: true });
  const precision = settings.getByRole("button", { name: "About Value precision", exact: true });
  await expect(theme).toBeVisible();
  await expect(density).toBeVisible();
  await expect(precision).toBeVisible();
  await expect(settings.locator('.settings-label [role="img"]')).toHaveCount(0);
  const appearance = settings.getByRole("radio", { checked: true });
  const selected = await appearance.innerText();
  await theme.focus();
  await theme.press("Enter");
  await expect(page.getByRole("tooltip")).toHaveText(
    "“System” follows your operating system and switches automatically when it does.",
  );
  await expect(appearance).toHaveText(selected);
  await page.keyboard.press("Escape");

  const tips = [
    [
      "Crosshair rails",
      "Rails on both axes follow the pointer over the chart, reading out the exact time and value under it.",
    ],
    [
      "Time cursor",
      "The violet line over the chart marking the current time, with its readout - drawn whether or not audio or an animation is attached. The matching needle on the lanes below stays either way, so the time can still be dragged.",
    ],
    [
      "Multilayer selection",
      "Marquee selection spans every visible layer instead of only the active one.",
    ],
  ];
  for (const [label, text] of tips) {
    const input = settings.getByRole("switch", { name: label, exact: true });
    const before = await input.isChecked();
    await settings.getByRole("button", { name: `About ${label}`, exact: true }).click();
    await expect(page.getByRole("tooltip")).toHaveText(text);
    await expect(input).toBeChecked({ checked: before });
    await page.keyboard.press("Escape");
  }
});

test("grid density help follows every source choice", async ({ page }) => {
  const settings = page.locator(".settings-panel");
  const tips = [
    ["Off", "No gridlines or axis labels - just the chart."],
    ["Sparse", "Widely spaced lines, labels only. Least visual noise."],
    ["Normal", "Balanced spacing, with faint lines between the labeled ones."],
    ["Dense", "Tight spacing and more subdivisions, for precise placement."],
  ];
  for (const [label, text] of tips) {
    await settings.getByRole("button", { name: "Grid density", exact: true }).click();
    await settings.getByRole("option", { name: label, exact: true }).click();
    await settings.getByRole("button", { name: "About Grid density", exact: true }).click();
    await expect(page.getByRole("tooltip")).toHaveText(text);
    await page.keyboard.press("Escape");
  }
});

test("precision help formats the source example at the selected precision", async ({ page }) => {
  const settings = page.locator(".settings-panel");
  for (const [label, example] of [
    ["1%", "45%"],
    ["0.1%", "45.3%"],
    ["0.01%", "45.30%"],
  ]) {
    await settings.getByRole("button", { name: "Value precision", exact: true }).click();
    await settings.getByRole("option", { name: label, exact: true }).click();
    await settings.getByRole("button", { name: "About Value precision", exact: true }).click();
    await expect(page.getByRole("tooltip")).toHaveText(
      `How finely intensity and frequency can be set - ${example} at this precision. Values are shown as a percentage; presets still store them as 0-1 for the Pulsar SDK. Changing this only affects new edits.`,
    );
    await page.keyboard.press("Escape");
  }
});
