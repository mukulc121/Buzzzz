import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"])
  for (const width of [1440, 1024])
    test(`${theme} collapsed inspector keeps the published rail at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((theme) => {
        localStorage.setItem("buzzzz.onboarding.seen", "true");
        localStorage.setItem("buzzzz.mobile-notice-dismissed", "1");
        localStorage.setItem("rive-haptics-theme", theme);
      }, theme);
      await page.routeWebSocket("**/relay?role=studio", (socket) =>
        socket.send(JSON.stringify({ type: "peers", phones: 0 })),
      );
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const inspector = page.getByRole("complementary", { name: "Inspector", exact: true });
      const rail = page.locator(".inspector-rail");
      const show = page.getByRole("button", { name: "Show inspector", exact: true });
      const editor = page.locator(".editor-canvas");
      const colors =
        theme === "light"
          ? {
              panel: "rgb(255, 255, 255)",
              border: "rgb(181, 225, 241)",
              muted: "rgb(95, 107, 147)",
              hover: "rgb(225, 243, 250)",
              primary: "rgb(0, 26, 114)",
              focus: "rgb(43, 133, 171)",
            }
          : {
              panel: "rgb(20, 29, 51)",
              border: "rgb(39, 53, 79)",
              muted: "rgb(154, 166, 201)",
              hover: "rgb(15, 34, 49)",
              primary: "rgb(219, 228, 255)",
              focus: "rgb(108, 199, 239)",
            };
      for (const sidebar of [true, false]) {
        if (!sidebar) await page.getByRole("button", { name: "Hide panel", exact: true }).click();
        const inspectorWidth = await inspector.evaluate(
          (node) => node.getBoundingClientRect().width,
        );
        const editorWidth = await editor.evaluate((node) => node.getBoundingClientRect().width);
        await inspector.getByRole("button", { name: "Hide inspector", exact: true }).click();
        await page.mouse.move(0, 0);
        await expect(inspector).toHaveCount(0);
        await expect(
          page.getByRole("separator", { name: "Resize inspector", exact: true }),
        ).toHaveCount(0);
        await expect(show).toHaveCount(1);
        await expect(
          editor.getByRole("button", { name: "Show inspector", exact: true }),
        ).toHaveCount(0);
        await expect(show).toHaveAttribute("title", "Show inspector");
        await expect(rail).toHaveCSS("padding-top", "8px");
        await expect(rail).toHaveCSS("border-left-width", "2px");
        await expect(rail).toHaveCSS("border-left-color", colors.border);
        await expect(rail).toHaveCSS("background-color", colors.panel);
        const layout = await rail.evaluate((node) => {
          const workspace = node.parentElement;
          const editor = workspace?.querySelector(".editor-canvas");
          const button = node.querySelector("button");
          if (!workspace || !editor || !button)
            throw new Error("Collapsed inspector is missing its editor or button");
          const bounds = node.getBoundingClientRect();
          const parent = workspace.getBoundingClientRect();
          const canvas = editor.getBoundingClientRect();
          const toggle = button.getBoundingClientRect();
          return {
            width: bounds.width,
            height: bounds.height,
            workspaceHeight: parent.height,
            rightGap: parent.right - bounds.right,
            topGap: bounds.top - parent.top,
            editorGap: bounds.left - canvas.right,
            buttonInset: [toggle.left - bounds.left, toggle.top - bounds.top],
            editorWidth: canvas.width,
          };
        });
        expect(layout).toEqual({
          width: 44,
          height: layout.workspaceHeight,
          workspaceHeight: layout.workspaceHeight,
          rightGap: 0,
          topGap: 0,
          editorGap: 0,
          buttonInset: [5, 8],
          editorWidth: editorWidth + inspectorWidth - 44,
        });
        await expect(show).toHaveCSS("width", "36px");
        await expect(show).toHaveCSS("height", "36px");
        await expect(show).toHaveCSS("padding", "0px");
        await expect(show).toHaveCSS("border-width", "2px");
        await expect(show).toHaveCSS("border-radius", "4px");
        await expect(show).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await expect(show).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
        await expect(show).toHaveCSS("color", colors.muted);
        const icon = show.locator("svg");
        await expect(icon).toHaveAttribute("width", "18");
        await expect(icon).toHaveAttribute("height", "18");
        await expect(icon).toHaveAttribute("viewBox", "0 0 24 24");
        await expect(icon).toHaveAttribute("stroke-width", "2");
        await expect(icon).toHaveAttribute("stroke-linecap", "round");
        await expect(icon).toHaveAttribute("stroke-linejoin", "round");
        expect(
          await icon
            .locator("rect")
            .evaluate((node) =>
              ["width", "height", "x", "y", "rx"].map((key) => node.getAttribute(key)),
            ),
        ).toEqual(["18", "18", "3", "3", "2"]);
        expect(
          await icon
            .locator("path")
            .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d"))),
        ).toEqual(["M15 3v18", "m10 15-3-3 3-3"]);
        if (sidebar) await rail.screenshot({ path: testInfo.outputPath("rail-idle.png") });
        await show.hover();
        await expect(show).toHaveCSS("background-color", colors.hover);
        await expect(show).toHaveCSS("border-top-color", colors.border);
        await expect(show).toHaveCSS("color", colors.primary);
        await expect(show).toHaveCSS("transform", "none");
        if (sidebar) await rail.screenshot({ path: testInfo.outputPath("rail-hover.png") });
        await page.mouse.move(0, 0);
        await show.focus();
        await show.press("Shift+Tab");
        await page.keyboard.press("Tab");
        await expect(show).toBeFocused();
        await expect(show).toHaveCSS("outline-style", "solid");
        await expect(show).toHaveCSS("outline-width", "2px");
        await expect(show).toHaveCSS("outline-offset", "2px");
        await expect(show).toHaveCSS("outline-color", colors.focus);
        if (sidebar) await rail.screenshot({ path: testInfo.outputPath("rail-focus.png") });
        await show.press("Enter");
        await expect(inspector).toBeVisible();
        await expect(rail).toHaveCount(0);
        await expect(inspector).toHaveCSS("width", `${inspectorWidth}px`);
        await expect(
          page.getByRole("separator", { name: "Resize inspector", exact: true }),
        ).toHaveCount(1);
      }
    });
