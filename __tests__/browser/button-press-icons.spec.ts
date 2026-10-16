import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "Device", exact: true }).click();
});

for (const theme of ["light", "dark"]) {
  test(`${theme} action press follows Pulsar offsets without moving siblings`, async ({
    page,
  }, testInfo) => {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    const button = page.getByRole("button", { name: "Connect device", exact: true });
    const sibling = page.getByRole("button", { name: "Don't have Buzzzz Preview?", exact: true });
    const shadow = theme === "light" ? "rgb(56, 172, 221)" : "rgb(5, 8, 15)";
    const border = theme === "light" ? "rgb(56, 172, 221)" : "rgb(63, 177, 230)";
    const bounds = await button.boundingBox();
    const siblingBounds = await sibling.boundingBox();
    expect(bounds).not.toBeNull();
    await expect(button).toHaveCSS("transform", "none");
    await expect(button).toHaveCSS("box-shadow", `${shadow} -4px 4px 0px 0px`);
    await expect(button).toHaveCSS("transition-duration", "0.2s, 0.2s");
    await expect(button).toHaveCSS("transition-timing-function", "ease, ease");
    await expect(button).toHaveCSS("font-size", "14px");
    await expect(button).toHaveCSS("line-height", "14px");
    await expect(button).toHaveCSS("padding", "8px 14px");
    expect(bounds?.height).toBe(34);

    await button.hover();
    await expect(button).toHaveCSS("transform", "matrix(1, 0, 0, 1, 1, -1)");
    await expect(button).toHaveCSS("box-shadow", `${shadow} -5px 5px 0px 0px`);
    expect(await sibling.boundingBox()).toEqual(siblingBounds);

    await page.mouse.down();
    await expect(button).toHaveCSS("transform", "matrix(1, 0, 0, 1, -3, 3)");
    await expect(button).toHaveCSS("box-shadow", `${border} -1px 1px 0px 0px`);
    expect(await button.boundingBox()).toEqual(
      bounds && { ...bounds, x: bounds.x - 3, y: bounds.y + 3 },
    );
    expect(await sibling.boundingBox()).toEqual(siblingBounds);
    await page.screenshot({ path: testInfo.outputPath("pressed.png") });

    await page.mouse.move(700, 40);
    await page.mouse.up();
    await expect(button).toHaveCSS("transform", "none");
    await expect(button).toHaveCSS("box-shadow", `${shadow} -4px 4px 0px 0px`);
    expect(await button.boundingBox()).toEqual(bounds);
    expect(await sibling.boundingBox()).toEqual(siblingBounds);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.keyboard.press("Tab");
    await button.focus();
    await expect(button).toBeFocused();
    await expect(button).toHaveCSS("outline-style", "solid");
    await expect(button).toHaveCSS("outline-width", "2px");
    await expect(button).toHaveCSS("outline-offset", "2px");
    await expect(button).toHaveCSS(
      "outline-color",
      theme === "light" ? "rgb(43, 133, 171)" : "rgb(108, 199, 239)",
    );

    await button.evaluate((element) => {
      if (element instanceof HTMLButtonElement) element.disabled = true;
    });
    await button.hover({ force: true });
    await page.mouse.down();
    await expect(button).toHaveCSS("transform", "none");
    await expect(button).toHaveCSS("box-shadow", "none");
    await expect(button).toHaveCSS("opacity", "0.5");
    await expect(button).toHaveCSS("cursor", "not-allowed");
    await page.mouse.up();
  });
}

test("rail uses source SVG geometry and stays flat while pressed", async ({ page }) => {
  const rail = page.getByRole("navigation", { name: "Workspace" });
  for (const name of [
    "Patterns",
    "Media",
    "Device",
    "Share",
    "MCP",
    "Tools",
    "Settings",
    "Learn",
  ]) {
    const icon = rail.getByRole("button", { name, exact: true }).locator("svg");
    await expect(icon).toHaveAttribute("width", "20");
    await expect(icon).toHaveAttribute("height", "20");
    await expect(icon).toHaveAttribute("viewBox", "0 0 24 24");
    await expect(icon).toHaveAttribute("stroke-width", "2");
    await expect(icon).toHaveAttribute("stroke-linecap", "round");
    await expect(icon).toHaveAttribute("stroke-linejoin", "round");
  }
  const share = rail.getByRole("button", { name: "Share", exact: true });
  expect(
    await share
      .locator("circle")
      .evaluateAll((circles) =>
        circles.map((circle) => [
          circle.getAttribute("cx"),
          circle.getAttribute("cy"),
          circle.getAttribute("r"),
        ]),
      ),
  ).toEqual([
    ["18", "5", "3"],
    ["6", "12", "3"],
    ["18", "19", "3"],
  ]);
  expect(
    await share
      .locator("line")
      .evaluateAll((lines) =>
        lines.map((line) => [
          line.getAttribute("x1"),
          line.getAttribute("x2"),
          line.getAttribute("y1"),
          line.getAttribute("y2"),
        ]),
      ),
  ).toEqual([
    ["8.59", "15.42", "13.51", "17.49"],
    ["15.41", "8.59", "6.51", "10.49"],
  ]);
  const bounds = await share.boundingBox();
  await share.hover();
  await page.mouse.down();
  await expect(share).toHaveCSS("transform", "none");
  await expect(share).toHaveCSS("box-shadow", "none");
  expect(await share.boundingBox()).toEqual(bounds);
  await page.mouse.up();
});

test("reduced motion keeps the pressed offset with no transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const button = page.getByRole("button", { name: "Connect device", exact: true });
  await expect(button).toHaveCSS("transition-duration", "0s");
  await button.hover();
  await page.mouse.down();
  await expect(button).toHaveCSS("transform", "matrix(1, 0, 0, 1, -3, 3)");
  await page.mouse.move(700, 40);
  await page.mouse.up();
  await expect(button).toHaveCSS("transform", "none");
});

test("Library footer uses the source medium typography and icon geometry", async ({
  page,
}, testInfo) => {
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Pulsar Library", exact: true }).click();
  const library = page.getByRole("region", { name: "Pulsar Library", exact: true });
  await library.getByRole("searchbox").fill("Afterglow");
  await library.getByRole("button", { name: "About Afterglow", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Afterglow", exact: true });
  const button = detail.getByRole("button", { name: "Add to preset", exact: true });
  await page.mouse.move(700, 40);
  await expect(button).toHaveCSS("font-size", "16px");
  await expect(button).toHaveCSS("font-weight", "500");
  await expect(button).toHaveCSS("line-height", "16px");
  await expect(button).toHaveCSS("padding", "12px 20px");
  await expect(button).toHaveCSS("box-shadow", "rgb(56, 172, 221) -4px 4px 0px 0px");
  await expect(button.locator("svg")).toHaveAttribute("width", "18");
  await expect(button.locator("svg")).toHaveAttribute("height", "18");
  // Source Ee's medium icon is 18px, so its 24px padding and 4px border yield 46px.
  expect((await button.boundingBox())?.height).toBe(46);
  const play = detail.getByRole("button", { name: "Play", exact: true });
  await expect(play).toHaveCSS("font-size", "14px");
  await expect(play).toHaveCSS("padding", "8px 14px");
  expect((await play.boundingBox())?.height).toBe(36);
  await page.screenshot({ path: testInfo.outputPath("library-medium-button.png") });
});

test("tool actions use the source small size in both sidebar and floating window", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Time Warp", exact: true }).click();
  const button = page.getByRole("button", { name: "Apply time warp", exact: true });
  await expect(button).toHaveCSS("font-size", "14px");
  await expect(button).toHaveCSS("line-height", "14px");
  await expect(button).toHaveCSS("padding", "8px 14px");
  expect((await button.boundingBox())?.height).toBe(34);
  await page.getByRole("button", { name: "Open in window", exact: true }).click();
  const window = page.getByRole("dialog", { name: "Time Warp tool window", exact: true });
  const floatingButton = window.getByRole("button", { name: "Apply time warp", exact: true });
  await expect(floatingButton).toHaveCSS("font-size", "14px");
  await expect(floatingButton).toHaveCSS("padding", "8px 14px");
  expect((await floatingButton.boundingBox())?.height).toBe(34);
});
