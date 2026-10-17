import { expect, test } from "@playwright/test";

for (const platform of [
  {
    name: "Mac",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    redo: "⇧⌘Z",
    remove: "⌦",
  },
  {
    name: "Windows",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    redo: "Ctrl+Shift+Z",
    remove: "Del",
  },
]) {
  test.describe(platform.name, () => {
    test.use({ userAgent: platform.userAgent });
    test("settings display source key labels and the dark theme chooser color", async ({
      page,
    }) => {
      await page.routeWebSocket("**/relay?role=studio", (socket) =>
        socket.send(JSON.stringify({ type: "peers", phones: 0 })),
      );
      await page.goto("/");
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      const panel = page.locator(".settings-panel");
      const shortcuts = panel.locator(".settings-shortcuts").first();
      for (const [label, key] of [
        ["Redo", platform.redo],
        ["Delete selection", platform.remove],
        ["Zoom out", "-"],
        ["Cancel paste or clear selection", "Esc"],
        ["Activate Intensity", "1"],
        ["Activate Frequency", "2"],
        ["Activate Discrete", "3"],
      ])
        await expect(
          shortcuts
            .locator("li")
            .filter({ has: page.getByText(label, { exact: true }) })
            .locator("kbd"),
        ).toHaveText(key);
      const chooser = panel.getByRole("radiogroup", { name: "Appearance", exact: true });
      await chooser.getByRole("radio", { name: "Light", exact: true }).click();
      await expect(chooser).toHaveCSS("background-color", "rgb(225, 243, 250)");
      await chooser.getByRole("radio", { name: "Dark", exact: true }).click();
      await expect(chooser).toHaveCSS("background-color", "rgb(15, 34, 49)");
      await page.reload();
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await expect(chooser).toHaveCSS("background-color", "rgb(15, 34, 49)");
    });
  });
}
