import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";

const sourceUploadPaths = [
  "M12 13v8",
  "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242",
  "m8 17 4-4 4 4",
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("buzzzz.onboarding.seen", "true"));
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
});

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    test(`${theme} ${width}px media upload matches Pulsar's modal and drop target`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page
        .getByRole("radio", { name: theme === "dark" ? "Dark" : "Light", exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.getByRole("button", { name: "Media", exact: true }).click();
      const upload = page.getByRole("button", { name: "Upload media", exact: true });
      await upload.click();
      const dialog = page.getByRole("dialog", { name: "Upload media", exact: true });
      const header = dialog.locator("header");
      const footer = dialog.locator("footer");
      const drop = dialog.getByRole("button", { name: /Drag files here/ });
      const border = theme === "light" ? "rgb(56, 172, 221)" : "rgb(63, 177, 230)";
      await expect(dialog).toHaveCSS("width", `${Math.min(440, width * 0.9)}px`);
      await expect(dialog).toHaveCSS("padding", "24px");
      await expect(dialog).toHaveCSS("border-width", "2px");
      await expect(dialog).toHaveCSS("border-radius", "4px");
      await expect(dialog).toHaveCSS("border-color", border);
      await expect(dialog).toHaveCSS("box-shadow", `${border} -6px 6px 0px 0px`);
      await expect(dialog.getByRole("heading")).toHaveCSS("font-size", "26px");
      await expect(header).toHaveCSS("gap", "16px");
      await expect(header).toHaveCSS("margin-bottom", "16px");
      await expect(header).toHaveCSS("border-bottom-width", "0px");
      await expect(footer).toHaveCSS("margin-top", "24px");
      await expect(footer).toHaveCSS("gap", "8px");
      await expect(footer).toHaveCSS("border-top-width", "0px");
      await expect(drop).toHaveCSS("padding", "40px 16px");
      await expect(drop).toHaveCSS("gap", "4px");
      await expect(drop).toHaveCSS("border-style", "dashed");
      await expect(drop.locator("svg")).toHaveAttribute("width", "28");
      await expect(drop.locator("svg")).toHaveAttribute("stroke-width", "2");
      expect(
        await drop
          .locator("svg path")
          .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("d"))),
      ).toEqual(sourceUploadPaths);
      await expect(dialog.locator(".media-drop-title")).toHaveCSS("font-size", "14px");
      await expect(dialog.locator(".media-drop-hint")).toHaveCSS("font-size", "12px");
      const cancel = dialog.getByRole("button", { name: "Cancel", exact: true });
      await expect(cancel).toHaveCSS("box-shadow", "none");
      await expect(cancel).toHaveCSS("padding", "12px 20px");
      const choose = dialog.getByRole("button", { name: "Choose files", exact: true });
      await expect(choose.locator("svg")).toHaveAttribute("width", "18");
      const close = dialog.getByRole("button", { name: "Close upload", exact: true });
      await expect(close).toHaveCSS("width", "36px");
      await expect(close.locator("svg")).toHaveAttribute("width", "20");
      await dialog.screenshot({ path: testInfo.outputPath(`${theme}-${width}-upload.png`) });
      await drop.dispatchEvent("dragover");
      await expect(drop).toHaveCSS("border-style", "solid");
      await expect(drop).toHaveCSS(
        "background-color",
        theme === "light" ? "rgb(181, 225, 241)" : "rgb(23, 50, 74)",
      );
      await drop.dispatchEvent("dragleave");
      await expect(drop).toHaveCSS("border-style", "dashed");
      await page.mouse.click(4, 4);
      await expect(dialog).not.toBeVisible();
      await upload.click();
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    });
  }
}

test("visible picker imports media with the source music and film glyphs", async ({ page }) => {
  const audio = unzipSync(
    readFileSync(
      new URL(
        "../../apps/studio/src/features/project/starter/starting-demo-project.pulsar",
        import.meta.url,
      ),
    ),
  )["audio/fanfaresound.mp3"]!;
  await page.goto("/");
  await expect(page.locator(".save-status")).toHaveAttribute("data-status", "editing");
  await page.getByRole("button", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Upload media", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Upload media", exact: true });
  const [picker] = await Promise.all([
    page.waitForEvent("filechooser"),
    dialog.getByRole("button", { name: "Choose files", exact: true }).click(),
  ]);
  await picker.setFiles([
    { name: "fanfare.mp3", mimeType: "audio/mpeg", buffer: Buffer.from(audio) },
    {
      name: "bounce.json",
      mimeType: "application/json",
      buffer: readFileSync("apps/preview/src/features/demos/lottie/bounce.json"),
    },
  ]);
  await expect(dialog).not.toBeVisible();
  const music = page.locator(".media-item").filter({ hasText: "fanfare.mp3" });
  const film = page.locator(".media-item").filter({ hasText: "bounce.json" });
  for (const row of [music, film]) {
    await expect(row.locator(".media-file-icon svg")).toHaveAttribute("width", "18");
    await expect(row.locator(".media-file-icon svg")).toHaveAttribute("stroke-width", "2");
  }
  expect(
    await music
      .locator(".media-file-icon circle")
      .evaluateAll((nodes) =>
        nodes.map((node) => [
          node.getAttribute("cx"),
          node.getAttribute("cy"),
          node.getAttribute("r"),
        ]),
      ),
  ).toEqual([
    ["6", "18", "3"],
    ["18", "16", "3"],
  ]);
  await expect(music.locator(".media-file-icon path")).toHaveAttribute("d", "M9 18V5l12-2v13");
  await expect(film.locator(".media-file-icon rect")).toHaveAttribute("rx", "2");
  await expect(film.locator(".media-file-icon path")).toHaveCount(7);
  await music.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Play", exact: true }).click();
  await expect(music).toHaveAttribute("data-playing", "true");
  await expect(music).toHaveCSS("border-color", "rgb(31, 143, 95)");
  await expect(music.locator(".media-file-icon")).toHaveCSS(
    "background-color",
    "rgb(232, 247, 239)",
  );
  await expect(music.locator(".media-file-icon rect")).toHaveCount(2);
  await expect(music.locator(".media-file-icon svg")).toHaveAttribute("width", "18");
  await music.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Stop", exact: true }).click();
  await expect(music).toHaveAttribute("data-playing", "false");
  await expect(music.locator(".media-file-icon circle")).toHaveCount(2);
});
