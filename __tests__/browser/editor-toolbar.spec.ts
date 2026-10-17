import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { editorPlay, editorStop } from "./fixtures/editor-playback";

async function openEditor(page: Page, phones: number) {
  await page.addInitScript(() => {
    const record = {
      id: "toolbar",
      name: "Toolbar",
      revision: 0,
      createdAt: 1,
      updatedAt: 1,
      project: {
        presets: [
          {
            id: "toolbar-pattern",
            name: "Toolbar pattern",
            editor: { durationMs: 30000, markers: [], range: null },
            pattern: {
              discretePattern: [{ time: 0, amplitude: 1, frequency: 0.5 }],
              continuousPattern: { amplitude: [], frequency: [] },
            },
          },
        ],
        map: {},
      },
    };
    localStorage.setItem("buzzzz.onboarding.seen", "true");
    localStorage.setItem("buzzzz.project.toolbar", JSON.stringify(record));
    localStorage.setItem("buzzzz.lastProject", "toolbar");
  });
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones })),
  );
  await page.goto("/studio/projects/toolbar");
  await expect(editorPlay(page)).toHaveAttribute(
    "aria-label",
    `Play “Toolbar pattern” - ${phones ? `${phones} device${phones === 1 ? "" : "s"}, ` : ""}sound · P`,
  );
}

async function sourceButton(page: Page, local: Locator, css: string) {
  const html = await local.evaluate((node) => node.outerHTML);
  await page.evaluate(
    ({ css, html }) => {
      document.querySelector("#source-toolbar-oracle")?.remove();
      const iframe = document.createElement("iframe");
      iframe.id = "source-toolbar-oracle";
      iframe.style.cssText = "position:fixed;left:400px;top:300px;width:180px;height:90px;border:0";
      const theme = document.documentElement.dataset.theme;
      const playing = html.includes('class="editor-play playing"');
      const markup = html
        .replace('class="editor-play playing"', 'class="_playButton_1y3ma_65 _playing_1y3ma_91"')
        .replace('class="editor-play"', 'class="_playButton_1y3ma_65"')
        .replace('class="editor-device-dot"', 'class="_deviceDot_1y3ma_99"');
      iframe.srcdoc = `<html data-theme="${theme}"><style>${css}</style><style>body{margin:0}</style><body><div class="_bar_1y3ma_1">${markup}</div></body></html>`;
      document.body.append(iframe);
      iframe.dataset.playing = String(playing);
    },
    { css, html },
  );
  return page.frameLocator("#source-toolbar-oracle").getByRole("button");
}

test("standalone animation playback uses the source toolbar Stop and rewinds without playing the chart", async ({
  page,
}) => {
  await openEditor(page, 0);
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  await page
    .getByRole("region", { name: "Animation tools", exact: true })
    .getByLabel("Lottie file", { exact: true })
    .setInputFiles("apps/preview/src/features/demos/lottie/bounce.json");
  const preview = page.getByRole("region", { name: "Animation canvas preview", exact: true });
  const canvas = preview.locator("canvas");
  await expect(canvas).toBeVisible();
  const initial = await canvas.screenshot();
  const cursor = page.getByRole("slider", { name: "Playback position", exact: true }).first();
  const before = await cursor.getAttribute("aria-valuenow");
  await preview.getByRole("button", { name: "Play animation", exact: true }).click();
  await expect(editorStop(page)).toBeVisible();
  await expect(cursor).toHaveAttribute("aria-valuenow", before!);
  await page.keyboard.press("p");
  await expect(preview.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
  await expect(editorPlay(page)).toBeVisible();
  await expect.poll(async () => (await canvas.screenshot()).equals(initial)).toBe(true);
});

for (const theme of ["light", "dark"] as const) {
  test(`${theme} toolbar matches source geometry, icons, output labels and playing states`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await openEditor(page, 2);
    const play = editorPlay(page);
    await expect(play).toHaveAttribute("title", "Play “Toolbar pattern” - 2 devices, sound · P");
    await expect(play.locator("svg")).toHaveAttribute("width", "15");
    await expect(play.locator("svg")).toHaveAttribute("viewBox", "0 0 24 24");
    await expect(play.locator("svg path")).toHaveAttribute(
      "d",
      "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",
    );
    expect((await play.boundingBox())?.width).toBe(57);
    expect((await play.boundingBox())?.height).toBe(46);
    await expect(play.locator(".editor-device-dot")).toHaveCSS("width", "6px");
    await expect(play.locator(".editor-device-dot")).toHaveCSS(
      "background-color",
      theme === "light" ? "rgb(31, 143, 95)" : "rgb(53, 201, 138)",
    );
    const saved = page.locator(".save-status");
    await expect(saved).toHaveText("Saved");
    await expect(saved.locator("svg")).toHaveAttribute("width", "14");
    await expect(saved.locator("svg path")).toHaveAttribute("d", "M20 6 9 17l-5-5");
    await expect(saved).toHaveCSS("gap", "4px");
    await expect(saved).toHaveCSS("padding", "0px 8px");
    await play.hover();
    await expect(play).toHaveCSS(
      "background-color",
      theme === "light" ? "rgb(225, 243, 250)" : "rgb(15, 34, 49)",
    );
    await play.click();
    await expect(editorStop(page)).toHaveCSS(
      "color",
      theme === "light" ? "rgb(214, 69, 69)" : "rgb(242, 128, 127)",
    );
    await expect(editorStop(page).locator("svg rect")).toHaveAttribute("width", "18");
    await expect(editorStop(page)).toHaveCSS(
      "background-color",
      theme === "light" ? "rgb(253, 236, 236)" : "rgb(58, 28, 28)",
    );
    await page.keyboard.press("p");
    await expect(editorPlay(page)).toBeVisible();
    for (const modifiers of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { shiftKey: true },
    ]) {
      await page.locator("body").dispatchEvent("keydown", { key: "p", ...modifiers });
      await expect(editorPlay(page)).toBeVisible();
    }
    await page.locator("body").dispatchEvent("keydown", { key: "MediaPlayPause" });
    await expect(editorStop(page)).toBeVisible();
    await page.locator("body").dispatchEvent("keydown", { key: "MediaPlayPause" });
    await expect(editorPlay(page)).toBeVisible();
    await page.getByRole("switch", { name: "Play on device", exact: true }).click();
    await expect(editorPlay(page).locator(".editor-device-dot")).toHaveCount(0);
    expect((await editorPlay(page).boundingBox())?.width).toBe(49);
    await page.getByRole("switch", { name: "Haptics as sound", exact: true }).click();
    await expect(editorPlay(page)).toHaveAttribute(
      "aria-label",
      "Nothing to play - check the Preview switches",
    );
  });

  test(`${theme} toolbar pixels match the published stylesheet`, async ({ page }, info) => {
    test.skip(!process.env.PULSAR_STUDIO_CSS, "Requires the published Pulsar CSS artifact");
    const css = await readFile(process.env.PULSAR_STUDIO_CSS!, "utf8");
    await page.emulateMedia({ colorScheme: theme });
    await openEditor(page, 1);
    for (const playing of [false, true]) {
      if (playing) await editorPlay(page).click();
      const local = playing ? editorStop(page) : editorPlay(page);
      const reference = await sourceButton(page, local, css);
      await page.mouse.move(0, 0);
      const localImage = await local.screenshot({ animations: "disabled" });
      const sourceImage = await reference.screenshot({ animations: "disabled" });
      await info.attach(`local-${playing}`, { body: localImage, contentType: "image/png" });
      await info.attach(`source-${playing}`, { body: sourceImage, contentType: "image/png" });
      expect(localImage.equals(sourceImage)).toBe(true);
      await local.hover();
      const localHover = await local.screenshot({ animations: "disabled" });
      await reference.hover();
      const sourceHover = await reference.screenshot({ animations: "disabled" });
      await info.attach(`local-hover-${playing}`, { body: localHover, contentType: "image/png" });
      await info.attach(`source-hover-${playing}`, { body: sourceHover, contentType: "image/png" });
      expect(localHover.equals(sourceHover)).toBe(true);
      await page.locator("#source-toolbar-oracle").evaluate((node) => node.remove());
    }
  });
}
