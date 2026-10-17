import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`${theme} sidebar headers keep Pulsar's 48px baseline and collapse glyph`, async ({
    page,
  }) => {
    await page.addInitScript((value) => {
      localStorage.setItem("buzzzz.onboarding.seen", "true");
      localStorage.setItem("rive-haptics-theme", value);
    }, theme);
    await page.routeWebSocket("**/relay?role=studio", (socket) =>
      socket.send(JSON.stringify({ type: "peers", phones: 0 })),
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const brand = page.getByRole("img", { name: "Buzzzz", exact: true });
    await expect(brand).toBeVisible();
    expect(
      await brand.evaluate(async (image: HTMLImageElement) => {
        const svg = new DOMParser().parseFromString(
          await (await fetch(image.src)).text(),
          "image/svg+xml",
        );
        return svg.querySelector("title")?.textContent;
      }),
    ).toBe("Buzzzz");
    await expect(page.getByRole("img", { name: "Pulsar", exact: true })).toHaveCount(0);
    for (const panel of ["Media", "Device", "Share", "MCP", "Tools", "Settings", "Patterns"]) {
      await page.getByRole("button", { name: panel, exact: true }).click();
      const header = page.locator(".workspace-sidebar .panel-heading");
      await expect(header).toBeVisible();
      const bounds = await header.boundingBox();
      expect(bounds?.height, panel).toBe(48);
      expect(bounds?.y, panel).toBe(0);
      const collapse = header.getByRole("button", { name: "Hide panel", exact: true });
      await expect(collapse).toHaveCSS("width", "36px");
      await expect(collapse).toHaveCSS("height", "36px");
      const icon = collapse.locator("svg");
      await expect(icon).toHaveAttribute("viewBox", "0 0 24 24");
      await expect(icon).toHaveAttribute("width", "18");
      await expect(icon).toHaveAttribute("height", "18");
      expect(
        await icon.locator("path").evaluateAll((paths) => paths.map((p) => p.getAttribute("d"))),
      ).toEqual(["M9 3v18", "m16 15-3-3 3-3"]);
      if (panel === "Media") {
        await expect(header.locator(".media-heading-actions")).toHaveCSS("gap", "2px");
        const uploadButton = header.getByRole("button", { name: "Upload media" });
        const uploadIcon = uploadButton.locator("svg");
        await expect(uploadIcon).toHaveAttribute("width", "18");
        await expect(uploadIcon).toHaveAttribute("viewBox", "0 0 24 24");
        await expect(uploadIcon).toHaveAttribute("stroke-width", "2");
        expect(
          await uploadIcon
            .locator("path")
            .evaluateAll((paths) => paths.map((p) => p.getAttribute("d"))),
        ).toEqual(["M5 12h14", "M12 5v14"]);
        const upload = await uploadButton.boundingBox();
        const hide = await collapse.boundingBox();
        expect(hide!.x - upload!.x - upload!.width).toBe(2);
      }
      if (panel === "Tools") {
        await page.getByRole("button", { name: "Tap Rhythm", exact: true }).click();
        await expect(header.locator(":scope > div").first()).toHaveCSS("gap", "2px");
        const popOut = await header.getByRole("button", { name: "Open in window" }).boundingBox();
        const hide = await collapse.boundingBox();
        expect(hide!.x - popOut!.x - popOut!.width).toBe(2);
      }
      if (panel === "Settings")
        expect((await header.locator("+ .settings-panel h3").first().boundingBox())?.y).toBe(64);
    }
  });
}
