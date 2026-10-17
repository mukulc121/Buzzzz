import { expect, test, type Page } from "@playwright/test";

const names = [
  "undo",
  "redo",
  "paste",
  "copy",
  "bookmark",
  "trash",
  "marker",
  "file",
  "zoomIn",
  "zoomOut",
  "moveLeft",
  "moveRight",
  "activeLayer",
  "inactiveLayer",
  "selectLayer",
  "clear",
];

async function mount(page: Page, theme: string) {
  const entry = await (await page.request.get("/src/main.tsx")).text();
  const react = entry.match(/from "([^"]*\/react\.js\?[^"]*)"/)?.[1];
  const dom = entry.match(/from "([^"]*\/react-dom_client\.js\?[^"]*)"/)?.[1];
  if (!react || !dom) throw new Error("Missing Vite React modules");
  await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
        import * as ReactModule from ${JSON.stringify(react)};
        import * as DOMModule from ${JSON.stringify(dom)};
        import { ContextMenu } from "/src/components/ContextMenu.tsx";
        import { ContextMenuIcon } from "/src/components/ContextMenuIcon.tsx";
        import "/src/styles/index.css";
        const React = ReactModule.default ?? ReactModule;
        const { createRoot } = DOMModule.default ?? DOMModule;
        document.documentElement.dataset.theme = ${JSON.stringify(theme)};
        function Harness() {
          const [open, setOpen] = React.useState(false);
          const [selected, setSelected] = React.useState("");
          const names = ${JSON.stringify(names)};
          const items = names.map((name, index) => ({
            label: name,
            icon: React.createElement(ContextMenuIcon, {name}),
            shortcut: index === 0 ? "⌘Z" : index === 3 ? "⌘C" : undefined,
            disabled: index === 0,
            danger: name === "clear" || name === "trash",
            onSelect: () => setSelected(name)
          }));
          items.splice(4, 0, {separator: true});
          items.push({label: "No icon", onSelect: () => setSelected("No icon")});
          return React.createElement(React.Fragment, null,
            React.createElement("button", {onClick: () => setOpen(true)}, "Open menu"),
            React.createElement("output", null, selected),
            open && React.createElement(ContextMenu, {x: 1090, y: 890, items,
              onClose: () => setOpen(false)}));
        }
        createRoot(document.getElementById("root")).render(React.createElement(Harness));
      `,
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("menu").evaluate(async (node) => {
    await Promise.all(node.getAnimations().map((animation) => animation.finished));
  });
}

for (const theme of ["light", "dark"]) {
  test(`${theme}: source menu spacing, shortcuts, icons and keyboard behavior`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await mount(page, theme);
    const menu = page.getByRole("menu");
    const copy = page.getByRole("menuitem", { name: "copy ⌘C", exact: true });
    const redo = page.getByRole("menuitem", { name: "redo", exact: true });
    await expect(redo).toBeFocused();
    const metrics = await menu.evaluate((node) => {
      const menuStyle = getComputedStyle(node);
      const item = node.querySelector(".context-menu-item");
      const icon = node.querySelector("svg");
      const label = node.querySelector(".context-menu-label");
      const shortcut = node.querySelector(".context-menu-shortcut");
      if (!item || !icon || !label || !shortcut) throw new Error("Missing menu content");
      const itemStyle = getComputedStyle(item);
      const shortcutStyle = getComputedStyle(shortcut);
      return {
        menu: {
          border: menuStyle.borderWidth,
          padding: menuStyle.padding,
          radius: menuStyle.borderRadius,
          shadow: menuStyle.boxShadow,
        },
        item: {
          align: itemStyle.alignItems,
          gap: itemStyle.gap,
          padding: itemStyle.padding,
          font: itemStyle.fontSize,
          opacity: itemStyle.opacity,
          cursor: itemStyle.cursor,
        },
        icon: {
          width: icon.getBoundingClientRect().width,
          height: icon.getBoundingClientRect().height,
          viewBox: icon.getAttribute("viewBox"),
          stroke: icon.getAttribute("stroke-width"),
          cap: icon.getAttribute("stroke-linecap"),
          join: icon.getAttribute("stroke-linejoin"),
        },
        label: {
          flex: getComputedStyle(label).flex,
          overflow: getComputedStyle(label).textOverflow,
        },
        shortcut: {
          font: shortcutStyle.fontSize,
          margin: shortcutStyle.marginLeft,
          numeric: shortcutStyle.fontVariantNumeric,
          spacing: shortcutStyle.letterSpacing,
        },
        right: node.getBoundingClientRect().right,
        bottom: node.getBoundingClientRect().bottom,
      };
    });
    expect(metrics.menu).toEqual({
      border: "2px",
      padding: "4px",
      radius: "4px",
      shadow:
        theme === "light" ? "rgb(56, 172, 221) -2px 2px 0px 0px" : "rgb(5, 8, 15) -2px 2px 0px 0px",
    });
    expect(metrics.item).toEqual({
      align: "center",
      gap: "8px",
      padding: "8px 10px",
      font: "16px",
      opacity: "0.5",
      cursor: "default",
    });
    expect(metrics.icon).toEqual({
      width: 16,
      height: 16,
      viewBox: "0 0 24 24",
      stroke: "2",
      cap: "round",
      join: "round",
    });
    expect(metrics.label).toEqual({ flex: "1 1 0%", overflow: "ellipsis" });
    expect(metrics.shortcut).toEqual({
      font: "14px",
      margin: "16px",
      numeric: "tabular-nums",
      spacing: "0.28px",
    });
    expect(metrics.right).toBeLessThanOrEqual(1092);
    expect(metrics.bottom).toBeLessThanOrEqual(892);
    await expect(menu.locator("svg")).toHaveCount(16);
    await expect(menu.getByRole("separator")).toHaveCount(1);
    await expect(menu.locator(".context-menu-icon")).toHaveCount(16);
    await expect(
      menu.getByRole("menuitem", { name: "No icon", exact: true }).locator("span"),
    ).toHaveCount(1);
    await expect(copy.locator("svg rect")).toHaveAttribute("width", "14");
    await expect(
      menu.getByRole("menuitem", { name: "marker", exact: true }).locator("svg circle"),
    ).toHaveAttribute("r", "3");
    await expect(
      menu.getByRole("menuitem", { name: "activeLayer", exact: true }).locator("svg circle"),
    ).toHaveCount(2);
    await expect(
      menu.getByRole("menuitem", { name: "selectLayer", exact: true }).locator("svg path"),
    ).toHaveCount(12);
    await copy.hover();
    await expect(copy).toHaveCSS(
      "background-color",
      theme === "light" ? "rgb(225, 243, 250)" : "rgb(15, 34, 49)",
    );
    await expect(copy).toHaveCSS(
      "color",
      theme === "light" ? "rgb(0, 26, 114)" : "rgb(219, 228, 255)",
    );
    const danger = menu.getByRole("menuitem", { name: "trash", exact: true });
    await danger.hover();
    await expect(danger).toHaveCSS(
      "color",
      theme === "light" ? "rgb(214, 69, 69)" : "rgb(242, 128, 127)",
    );
    await expect(danger).toHaveCSS(
      "background-color",
      theme === "light" ? "rgb(253, 236, 236)" : "rgb(58, 28, 28)",
    );
    await expect(danger.locator("svg")).toHaveCSS(
      "color",
      theme === "light" ? "rgb(214, 69, 69)" : "rgb(242, 128, 127)",
    );
    await testInfo.attach("source-menu-metrics", {
      body: JSON.stringify(metrics, null, 2),
      contentType: "application/json",
    });
    const screenshot = testInfo.outputPath(`source-menu-${theme}.png`);
    await menu.screenshot({ path: screenshot });
    await testInfo.attach(`source-menu-${theme}`, {
      path: screenshot,
      contentType: "image/png",
    });
    await page.keyboard.press("Home");
    await expect(redo).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(menu.getByRole("menuitem", { name: "No icon", exact: true })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(redo).toBeFocused();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(menu).toHaveCount(0);
    await expect(page.locator("output")).toHaveText("No icon");
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
  });
}
