import { expect, test, type Locator } from "@playwright/test";

const RANGE_INFO =
  "Everything plays between these two markers - the haptics, an attached audio track and an attached animation. Drag them on any timeline, or type the exact times. Play starts at the violet time cursor when it sits inside the range, and at the start marker otherwise.";
const LOOP_INFO =
  "At the end marker, start the range again - the haptics, the audio and the animation together - until you press stop.";

function shortAudio() {
  const samples = 4000;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(16000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  return buffer;
}

async function expectPosition(button: Locator) {
  await expect
    .poll(() =>
      button.evaluate((node) => {
        const bubble = document.querySelector('[role="tooltip"]');
        if (!bubble) return false;
        const trigger = node.getBoundingClientRect();
        const bounds = bubble.getBoundingClientRect();
        const width = Math.min(240, innerWidth - 16);
        const left = Math.min(
          Math.max(trigger.left + trigger.width / 2 - width / 2, 8),
          innerWidth - width - 8,
        );
        return (
          Math.abs(bounds.top - trigger.bottom - 6) < 0.1 &&
          Math.abs(bounds.left - left) < 0.1 &&
          Math.abs(bounds.width - width) < 0.1
        );
      }),
    )
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("buzzzz.onboarding.seen", "true");
    localStorage.setItem("buzzzz.mobile-notice-dismissed", "1");
  });
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
});

for (const theme of ["light", "dark"])
  test(`${theme} inspector help follows source geometry and dismissal behavior`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 720 });
    await page.goto("/");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
      .getByRole("radio", { name: theme === "light" ? "Light" : "Dark", exact: true })
      .click();
    const help = page.getByRole("button", { name: "About Playback range", exact: true });
    const tooltip = page.getByRole("tooltip");
    await expect(help).toHaveAttribute("aria-expanded", "false");
    await expect(help).toHaveCSS("width", "16px");
    await expect(help).toHaveCSS("height", "16px");
    await expect(help.locator("svg")).toHaveAttribute("viewBox", "0 0 24 24");
    await expect(help.locator("svg")).toHaveAttribute("width", "13");
    await expect(help.locator("svg")).toHaveAttribute("stroke-width", "2");
    expect(
      await help
        .locator("svg path")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d"))),
    ).toEqual(["M12 16v-4", "M12 8h.01"]);
    await help.focus();
    await help.press("Enter");
    await expect(help).toBeFocused();
    await expect(help).toHaveCSS("outline-style", "solid");
    await expect(help).toHaveCSS("outline-width", "2px");
    await expect(help).toHaveCSS("outline-offset", "2px");
    await expect(help).toHaveAttribute("aria-expanded", "true");
    await expect(tooltip).toHaveText(RANGE_INFO);
    await expect(tooltip).toHaveCSS("position", "fixed");
    await expect(tooltip).toHaveCSS("z-index", "1000");
    await expect(tooltip).toHaveCSS("padding", "8px");
    await expect(tooltip).toHaveCSS("border-width", "2px");
    await expect(tooltip).toHaveCSS("border-radius", "4px");
    await expect(tooltip).toHaveCSS("font-size", "12px");
    await expect(tooltip).toHaveCSS("line-height", "18px");
    await expect(tooltip).toHaveCSS(
      "background-color",
      theme === "light" ? "rgb(255, 255, 255)" : "rgb(20, 29, 51)",
    );
    await expectPosition(help);
    await tooltip.screenshot({ path: testInfo.outputPath(`${theme}-playback-help.png`) });
    await tooltip.click();
    await expect(help).toHaveAttribute("aria-expanded", "true");
    await help.click();
    await expect(tooltip).toHaveCount(0);
    await help.press("Space");
    await expect(tooltip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tooltip).toHaveCount(0);
    await expect(help).toHaveAttribute("aria-expanded", "false");
    await help.click();
    await page.getByRole("heading", { name: "Preview", exact: true }).click();
    await expect(tooltip).toHaveCount(0);

    await help.click();
    const beforeScroll = await help.boundingBox();
    await page.getByRole("complementary", { name: "Inspector", exact: true }).evaluate((node) => {
      node.scrollTop += 32;
    });
    await expect.poll(async () => (await help.boundingBox())?.y).not.toBe(beforeScroll?.y);
    await expectPosition(help);
    await page.setViewportSize({ width: 220, height: 720 });
    await expectPosition(help);
    await expect(tooltip).toHaveCSS("width", "204px");
    await expect(tooltip).toHaveCSS("left", "8px");
    await page.keyboard.press("Escape");
    await expect(tooltip).toHaveCount(0);
  });

test("switch help never toggles its associated input and labels still operate it", async ({
  page,
}) => {
  await page.goto("/");
  const loop = page.getByRole("switch", { name: "Loop", exact: true });
  const help = page.getByRole("button", { name: "About Loop", exact: true });
  await expect(loop).not.toBeChecked();
  await help.click();
  await expect(page.getByRole("tooltip")).toHaveText(LOOP_INFO);
  await expect(loop).not.toBeChecked();
  await page.getByRole("tooltip").click();
  await expect(loop).not.toBeChecked();
  await help.press("Space");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(loop).not.toBeChecked();
  await page
    .locator(".inspector-switch-label-row > label")
    .filter({ hasText: /^Loop$/ })
    .click();
  await expect(loop).toBeChecked();
  await loop.press("Space");
  await expect(loop).not.toBeChecked();

  for (const name of ["Play on device", "Audio track"]) {
    const input = page.getByRole("switch", { name, exact: true });
    await expect(input).toBeEnabled();
    await input.uncheck();
    await page.getByRole("button", { name: `About ${name}`, exact: true }).click();
    await expect(input).not.toBeChecked();
    await input.check();
    await expect(input).toBeChecked();
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  }
});

test("preview help follows the attached audio and connected animation sound conditions", async ({
  page,
}) => {
  test.setTimeout(60000);
  let peers: (phones: number) => void = () => {
    throw new Error("Studio socket has not connected");
  };
  await page.routeWebSocket("**/relay?role=studio", (socket) => {
    peers = (phones) => socket.send(JSON.stringify({ type: "peers", phones }));
    peers(0);
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Media", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No media yet", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload media", exact: true })).toBeEnabled();
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await page.getByLabel("Audio file", { exact: true }).setInputFiles({
    name: "preview.wav",
    mimeType: "audio/wav",
    buffer: shortAudio(),
  });
  await expect(page.getByRole("button", { name: "Remove from canvas", exact: true })).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  const sound = page.getByRole("switch", { name: "Haptics as sound", exact: true });
  const help = page.getByRole("button", { name: "About Haptics as sound", exact: true });
  const track = page.getByRole("switch", { name: "Audio track", exact: true });
  await expect(sound).toBeDisabled();
  await expect(sound).not.toBeChecked();
  await help.click();
  await expect(page.getByRole("tooltip")).toHaveText(
    "Not while the audio track is playing - it would play over it. An impression of the haptics through your speakers, for when there's no phone to hand.",
  );
  await track.uncheck();
  await expect(sound).toBeEnabled();
  await help.click();
  await expect(page.getByRole("tooltip")).toHaveText(
    "An impression of the haptics through your speakers, for when there's no phone to hand. A playing audio track takes its place - switch it off to hear the haptics instead; so does an animation, while a phone is playing the haptics.",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await page.getByRole("button", { name: "Remove from canvas", exact: true }).click();
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  await page
    .getByLabel("Lottie file", { exact: true })
    .setInputFiles("apps/preview/src/features/demos/lottie/bounce.json");
  await expect(page.getByRole("button", { name: "Remove from canvas", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await expect(sound).toBeEnabled();
  peers(1);
  await expect(sound).toBeDisabled();
  await help.click();
  await expect(page.getByRole("tooltip")).toHaveText(
    "Not while a phone is playing the haptics - it would play over it. An impression of the haptics through your speakers, for when there's no phone to hand.",
  );
  await page.getByRole("switch", { name: "Play on device", exact: true }).uncheck();
  await expect(sound).toBeEnabled();
});
