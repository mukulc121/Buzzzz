import { expect, test, type Page } from "@playwright/test";

const sourceSections = [
  { title: "Layers", height: 248, y: 48 },
  { title: "Controls", height: 104, y: 296 },
  { title: "Selection", height: 89, y: 400 },
  { title: "Playback range", height: 210, y: 489 },
  { title: "Preview", height: 209, y: 699 },
];

const markerHint = "No markers yet. They annotate the timeline - they don't change what plays.";

async function publishedHint(page: Page, stable: boolean) {
  return page.evaluate(
    ({ text, stable }) => {
      const reference = document.createElement("div");
      reference.style.cssText =
        'position:fixed;left:-10000px;top:0;width:300px;height:1000px;box-sizing:border-box;border-left:2px solid rgba(0,0,0,0);display:flex;flex-direction:column;font:400 14px "DM Sans",sans-serif';
      const header = document.createElement("div");
      header.style.cssText = "height:48px;flex-shrink:0";
      const body = document.createElement("div");
      body.style.cssText = "flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin";
      if (stable) body.style.scrollbarGutter = "stable";
      const spacer = document.createElement("div");
      spacer.style.height = "1000px";
      const section = document.createElement("section");
      section.style.padding = "16px";
      const hint = document.createElement("p");
      hint.style.cssText = "margin:0;font-size:14px;line-height:1.5";
      hint.textContent = text;
      section.append(hint);
      body.append(spacer, section);
      reference.append(header, body);
      document.body.append(reference);
      const { width, height } = hint.getBoundingClientRect();
      reference.remove();
      return { width, height };
    },
    { text: markerHint, stable },
  );
}

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
    const body = inspector.getByRole("tabpanel");
    expect(
      await body.evaluate((element) => getComputedStyle(element, "::-webkit-scrollbar").width),
    ).toBe("6px");
    await expect(body).toHaveCSS("scrollbar-width", "thin");
    const sections = inspector.locator(".inspector-section");
    await expect(sections.nth(5).locator(".hint")).toHaveText(markerHint);
    for (const stable of [false, true]) {
      await body.evaluate((element, stable) => {
        element.style.scrollbarGutter = stable ? "stable" : "auto";
      }, stable);
      const hint = await publishedHint(page, stable);
      expect(
        await sections
          .nth(5)
          .locator(".hint")
          .evaluate((element) => {
            const { width, height } = element.getBoundingClientRect();
            return { width, height };
          }),
      ).toEqual(hint);
      expect(
        await sections.evaluateAll((elements) =>
          elements.slice(0, 6).map((element) => ({
            title: element.querySelector("h3")?.textContent,
            height: element.getBoundingClientRect().height,
            y: element.getBoundingClientRect().y,
          })),
        ),
      ).toEqual([...sourceSections, { title: "Markers", height: 120 + hint.height, y: 908 }]);
    }
    await body.evaluate((element) => {
      element.style.removeProperty("scrollbar-gutter");
    });
    expect(
      await inspector
        .locator(".inspector-layer-swatch")
        .evaluateAll((elements) =>
          elements.map((element) => getComputedStyle(element).backgroundColor),
        ),
    ).toEqual(["rgb(43, 133, 171)", "rgb(0, 26, 114)", "rgb(56, 172, 221)"]);
    const blue30 = theme === "Dark" ? "rgb(44, 74, 99)" : "rgb(135, 204, 232)";
    await body.hover();
    await expect
      .poll(() =>
        body.evaluate(
          (element) => getComputedStyle(element, "::-webkit-scrollbar-thumb").backgroundColor,
        ),
      )
      .toBe(blue30);
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
