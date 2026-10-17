import { expect, test } from "@playwright/test";

const sourceSections = [
  { title: "Layers", height: 248, y: 48 },
  { title: "Controls", height: 104, y: 296 },
  { title: "Selection", height: 89, y: 400 },
  { title: "Playback range", height: 210, y: 489 },
  { title: "Preview", height: 209, y: 699 },
  { title: "Markers", height: 162, y: 908 },
];

for (const theme of ["Light", "Dark"]) {
  test(`Inspector matches published section geometry and controls in ${theme.toLowerCase()} mode`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
    await page.routeWebSocket("**/relay?role=studio", (socket) =>
      socket.send(JSON.stringify({ type: "peers", phones: 0 })),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name: theme, exact: true }).check();
    await page.evaluate(() => document.fonts.ready);
    const inspector = page.getByRole("complementary", { name: "Inspector", exact: true });
    const sections = inspector.locator(".inspector-section");
    expect(
      await sections.evaluateAll((elements) =>
        elements.slice(0, 6).map((element) => ({
          title: element.querySelector("h3")?.textContent,
          height: element.getBoundingClientRect().height,
          y: element.getBoundingClientRect().y,
        })),
      ),
    ).toEqual(sourceSections);
    expect(
      await inspector
        .locator(".inspector-layer-swatch")
        .evaluateAll((elements) =>
          elements.map((element) => getComputedStyle(element).backgroundColor),
        ),
    ).toEqual(["rgb(43, 133, 171)", "rgb(0, 26, 114)", "rgb(56, 172, 221)"]);
    const blue30 = theme === "Dark" ? "rgb(44, 74, 99)" : "rgb(135, 204, 232)";
    await expect(inspector.getByRole("radio", { name: "Edit frequency", exact: true })).toHaveCSS(
      "border-top-color",
      blue30,
    );
    const loop = inspector.getByRole("switch", { name: "Loop", exact: true });
    expect(
      await loop.evaluate((element) => ({
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      })),
    ).toEqual({ width: 40, height: 24 });
    await expect
      .poll(() => loop.evaluate((element) => getComputedStyle(element, "::after").backgroundColor))
      .toBe(blue30);
    await loop.check();
    await expect
      .poll(() => loop.evaluate((element) => getComputedStyle(element, "::after").left))
      .toBe("20px");
    await expect
      .poll(() => loop.evaluate((element) => getComputedStyle(element, "::after").backgroundColor))
      .toBe("rgb(255, 255, 255)");
    const sound = inspector.getByRole("switch", { name: "Haptics as sound", exact: true });
    await sound.uncheck();
    await expect(sound).not.toBeChecked();
    await sound.check();
    await inspector
      .getByRole("spinbutton", { name: "Playback range start", exact: true })
      .fill("10");
    const reset = inspector.getByRole("button", { name: "Play the whole preset", exact: true });
    await expect(reset).toBeEnabled();
    expect(await reset.evaluate((element) => element.getBoundingClientRect().height)).toBe(36);
    await reset.click();
    await expect(reset).toBeDisabled();
    await inspector.getByRole("radio", { name: "Edit frequency", exact: true }).check();
    const visible = inspector.getByRole("switch", { name: "Show frequency", exact: true });
    await visible.uncheck();
    await expect(
      page
        .getByRole("group", { name: "Haptic pattern timeline", exact: true })
        .getByRole("button", { name: /^Frequency point/ }),
    ).toHaveCount(0);
    await visible.check();
    await inspector.getByRole("button", { name: "Add marker at the cursor", exact: true }).click();
    await expect(inspector.getByRole("textbox", { name: "Marker label", exact: true })).toHaveValue(
      "Marker 1",
    );
  });
}
