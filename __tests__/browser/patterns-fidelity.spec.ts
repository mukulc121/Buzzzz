import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

// Pulsar ._item_14614_25, ._header_grb70_8 and lucide waypoints FI from the captured Studio bundle.
const SOURCE_WAYPOINTS = ["m10.586 5.414-5.172 5.172", "m18.586 13.414-5.172 5.172", "M6 12h12"];

for (const theme of ["light", "dark"]) {
  test(`${theme} Patterns rows retain the source icon, geometry and selection states`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript((value) => {
      localStorage.setItem("buzzzz.onboarding.seen", "true");
      localStorage.setItem("buzzzz.theme", value);
    }, theme);
    await page.routeWebSocket("**/relay?role=studio", (socket) =>
      socket.send(JSON.stringify({ type: "peers", phones: 0 })),
    );
    await page.goto("/");
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    const panel = page.getByRole("complementary", { name: "Project patterns", exact: true });
    const brand = page.getByRole("button", { name: "Projects", exact: true });
    const logo = brand.getByRole("img", { name: "Pulsar", exact: true });
    await expect(brand).toHaveAttribute("title", "Back to projects");
    await logo.evaluate((image: HTMLImageElement) => image.decode());
    await expect(logo).toHaveCSS("width", "30px");
    await expect(logo).toHaveCSS("height", "30px");
    const asset = await logo.evaluate(async (image: HTMLImageElement) => {
      const svg = new DOMParser().parseFromString(
        await (await fetch(image.src)).text(),
        "image/svg+xml",
      );
      return {
        geometry: {
          viewBox: svg.documentElement.getAttribute("viewBox"),
          transforms: [...svg.querySelectorAll("g")].map((group) =>
            group.getAttribute("transform"),
          ),
          paths: [...svg.querySelectorAll("path")].map((path) => path.getAttribute("d")),
        },
        colors: svg.documentElement.outerHTML.match(/rgba\([^)]+\)/g),
        naturalSize: [image.naturalWidth, image.naturalHeight],
      };
    });
    expect(createHash("sha256").update(JSON.stringify(asset.geometry)).digest("hex")).toBe(
      "079d4c444eb60118b31f48a6635792e2cded7d110d4c583439fe3727a1a9498c",
    );
    expect(asset.naturalSize).toEqual([40, 40]);
    expect(asset.colors).toEqual([
      "rgba(56, 172, 221, 1)",
      "rgba(225, 243, 250, 1)",
      "rgba(56, 172, 221, 1)",
      "rgba(225, 243, 250, 1)",
      "rgba(56, 172, 221, 1)",
    ]);
    const logoBounds = await brand.evaluate((node) => {
      const brand = node.getBoundingClientRect();
      const logo = node.querySelector("img")!.getBoundingClientRect();
      const next = node.nextElementSibling!.getBoundingClientRect();
      return {
        height: brand.height,
        logoInset: [logo.x - brand.x, logo.y - brand.y],
        nextGap: next.y - brand.bottom,
      };
    });
    expect(logoBounds).toEqual({ height: 48, logoInset: [14, 9], nextGap: 8 });
    await brand.screenshot({ path: testInfo.outputPath(`${theme}-brand-idle.png`) });
    await brand.hover();
    await expect(brand).toHaveCSS(
      "background-color",
      theme === "light" ? "rgb(225, 243, 250)" : "rgb(15, 34, 49)",
    );
    await brand.screenshot({ path: testInfo.outputPath(`${theme}-brand-hover.png`) });
    await page.mouse.move(0, 0);
    await brand.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(brand).toBeFocused();
    await expect(brand).toHaveCSS("outline-style", "solid");
    await expect(brand).toHaveCSS("outline-width", "2px");
    await expect(brand).toHaveCSS("outline-offset", "2px");
    await brand.screenshot({ path: testInfo.outputPath(`${theme}-brand-focus.png`) });
    await brand.evaluate((node: HTMLButtonElement) => node.blur());
    const thud = panel.getByRole("button", { name: "Thud", exact: true });
    const list = panel.locator(".pattern-list");
    const heading = panel.locator(".patterns-heading");
    await expect(thud).toHaveAttribute("aria-current", "true");
    await expect(thud.locator("svg")).toHaveAttribute("width", "16");
    await expect(thud.locator("svg")).toHaveAttribute("height", "16");
    await expect(thud.locator("svg")).toHaveAttribute("stroke-width", "2");
    expect(
      await thud
        .locator("svg path")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d"))),
    ).toEqual(SOURCE_WAYPOINTS);
    expect(
      await thud
        .locator("svg circle")
        .evaluateAll((nodes) =>
          nodes.map((node) => [
            node.getAttribute("cx"),
            node.getAttribute("cy"),
            node.getAttribute("r"),
          ]),
        ),
    ).toEqual([
      ["12", "20", "2"],
      ["12", "4", "2"],
      ["20", "12", "2"],
      ["4", "12", "2"],
    ]);

    await expect(thud).toHaveCSS("padding", "8px");
    await expect(thud).toHaveCSS("gap", "8px");
    await expect(thud).toHaveCSS("border-width", "2px");
    await expect(thud).toHaveCSS("border-radius", "4px");
    await expect(list).toHaveCSS("padding", "16px");
    await expect(list).toHaveCSS("gap", "2px");
    await expect(heading).toHaveCSS("height", "48px");
    await expect(heading).toHaveCSS("padding", "0px 8px 0px 16px");
    await expect(heading.getByRole("button", { name: "New pattern", exact: true })).toHaveCSS(
      "width",
      "36px",
    );
    await expect(heading.getByRole("button", { name: "Hide panel", exact: true })).toHaveCSS(
      "height",
      "36px",
    );
    await expect(heading.locator(".patterns-heading-actions")).toHaveCSS("gap", "2px");
    const collapse = heading
      .getByRole("button", { name: "Hide panel", exact: true })
      .locator("svg");
    await expect(collapse).toHaveAttribute("width", "18");
    await expect(collapse).toHaveAttribute("viewBox", "0 0 24 24");
    expect(
      await collapse
        .locator("path")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d"))),
    ).toEqual(["M9 3v18", "m16 15-3-3 3-3"]);

    const color =
      theme === "light"
        ? {
            background: "rgb(225, 243, 250)",
            border: "rgb(56, 172, 221)",
            icon: "rgb(43, 133, 171)",
          }
        : {
            background: "rgb(15, 34, 49)",
            border: "rgb(63, 177, 230)",
            icon: "rgb(108, 199, 239)",
          };
    await expect(thud).toHaveCSS("background-color", color.background);
    await expect(thud).toHaveCSS("border-color", color.border);
    await expect(thud.locator("svg")).toHaveCSS("color", color.icon);
    const bounds = await thud.evaluate((node) => {
      const button = node.getBoundingClientRect();
      const icon = node.querySelector("svg")?.getBoundingClientRect();
      const text = node.querySelector(".pattern-row-text")?.getBoundingClientRect();
      const list = node.closest("ul")?.getBoundingClientRect();
      const heading = node.closest("aside")?.querySelector("header")?.getBoundingClientRect();
      if (!icon || !text || !list || !heading) throw new Error("Missing pattern row geometry");
      return {
        inset: button.left - list.left,
        top: button.top - heading.bottom,
        iconInset: icon.left - button.left,
        textGap: text.left - icon.right,
        width: button.width,
        expectedWidth: list.width - 32,
      };
    });
    expect(bounds).toEqual({
      inset: 16,
      top: 16,
      iconInset: 10,
      textGap: 8,
      width: bounds.expectedWidth,
      expectedWidth: bounds.expectedWidth,
    });

    await panel.getByRole("button", { name: "New pattern", exact: true }).click();
    await page.mouse.move(0, 0);
    await expect(thud).toHaveAttribute("aria-current", "false");
    await expect(thud).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(thud).toHaveCSS("border-color", "rgba(0, 0, 0, 0)");
    await thud.hover();
    await expect(thud).toHaveCSS("background-color", color.background);
    await expect(thud).toHaveCSS("border-color", "rgba(0, 0, 0, 0)");
    await thud.click();
    await expect(thud).toHaveCSS("border-color", color.border);
    await expect(page.getByRole("textbox", { name: "Pattern name", exact: true })).toHaveValue(
      "Thud",
    );
    await brand.click();
    await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  });
}

test("renaming an inactive pattern updates only its target and keeps the editor selection", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  const panel = page.getByRole("complementary", { name: "Project patterns", exact: true });
  await panel.getByRole("button", { name: "New pattern", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Pattern name", exact: true })).toHaveValue(
    "Untitled pattern",
  );
  const thud = panel.getByRole("button", { name: "Thud", exact: true });
  await thud.click({ button: "right" });
  await expect(page.getByRole("menuitem")).toHaveText(["Rename", "Duplicate", "Remove"]);
  await expect(panel.locator("summary")).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const rename = panel.getByRole("textbox", { name: "Rename Thud", exact: true });
  await rename.fill("Cancelled");
  await rename.press("Escape");
  await expect(thud).toBeVisible();
  await thud.focus();
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await rename.fill("  Renamed  ");
  await rename.press("Enter");
  await expect(panel.getByRole("button", { name: "Renamed", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Renamed", exact: true })).toHaveAttribute(
    "aria-current",
    "false",
  );
  await expect(page.getByRole("textbox", { name: "Pattern name", exact: true })).toHaveValue(
    "Untitled pattern",
  );
  await page.reload();
  await expect(panel.getByRole("button", { name: "Renamed", exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Renamed", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Pattern name", exact: true })).toHaveValue(
    "Renamed",
  );
});

test("long pattern metadata wraps inside the minimum-width side panel", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("buzzzz.onboarding.seen", "true");
    localStorage.setItem("buzzzz.lastProject", "metadata");
    localStorage.setItem(
      "buzzzz.project.metadata",
      JSON.stringify({
        id: "metadata",
        name: "Metadata",
        createdAt: 1,
        updatedAt: 1,
        revision: 0,
        project: {
          presets: [
            {
              id: "long",
              name: "Long pattern",
              pattern: {
                discretePattern: Array.from({ length: 38 }, (_, time) => ({
                  time,
                  amplitude: 1,
                  frequency: 0.5,
                })),
                continuousPattern: { amplitude: [], frequency: [] },
              },
              editor: { markers: [], range: null, durationMs: 60000 },
            },
          ],
          map: {},
        },
      }),
    );
  });
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const panel = page.getByRole("complementary", { name: "Project patterns", exact: true });
  const row = panel.getByRole("button", { name: "Long pattern", exact: true });
  await expect(row).toContainText("60000 ms · 38 discrete");
  const handle = await page
    .getByRole("separator", { name: "Resize side panel", exact: true })
    .boundingBox();
  if (!handle) throw new Error("Missing side panel resize handle");
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x - 100, handle.y + handle.height / 2);
  await page.mouse.up();
  await expect(page.locator(".workspace-sidebar")).toHaveCSS("width", "200px");
  const metadata = row.locator(".pattern-row-meta");
  await expect(metadata).toHaveCSS("white-space", "normal");
  const lines = await metadata.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const column = node.getBoundingClientRect();
    return [...range.getClientRects()].map((line) => ({
      top: line.top,
      right: line.right,
      columnRight: column.right,
    }));
  });
  expect(new Set(lines.map((line) => line.top)).size).toBeGreaterThan(1);
  for (const line of lines) expect(line.right).toBeLessThanOrEqual(line.columnRight + 1);
});
