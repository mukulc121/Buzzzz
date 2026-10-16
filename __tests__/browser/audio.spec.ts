import { expect, test } from "@playwright/test";
function wav() {
  const rate = 16000;
  const count = rate * 2;
  const out = Buffer.alloc(44 + count * 2);
  out.write("RIFF");
  out.writeUInt32LE(36 + count * 2, 4);
  out.write("WAVEfmt ", 8);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const time = i / rate;
    const pulse = Math.exp(-((time % 0.5) * 22));
    out.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 180 * time) * pulse * 24000), 44 + i * 2);
  }
  return out;
}
for (const width of [390, 1440])
  test(`audio analysis, generation, trim and restoration at ${width}px`, async ({ page }) => {
    await page.routeWebSocket("**/relay?role=studio", (socket) =>
      socket.send(JSON.stringify({ type: "peers", phones: 0 })),
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const handles = page
      .getByRole("group", { name: "Haptic pattern timeline" })
      .getByRole("button");
    const labels = () =>
      handles.evaluateAll((items) => items.map((item) => item.getAttribute("aria-label")));
    const before = await labels();
    await page.getByRole("tab", { name: "sound", exact: true }).click();
    await page
      .getByLabel("Audio file", { exact: true })
      .setInputFiles({ name: "test-beats.wav", mimeType: "audio/wav", buffer: wav() });
    const apply = page.getByRole("button", { name: "Apply RMS envelope", exact: true });
    await expect(apply).toBeEnabled({ timeout: 20000 });
    await expect(page.getByRole("img", { name: "Audio waveform" })).toBeVisible();
    await expect(page.locator(".audio-candidate")).toHaveCount(9);
    await apply.click();
    await page.getByRole("button", { name: "Replace pattern", exact: true }).click();
    await expect.poll(labels).not.toEqual(before);
    await page.getByRole("button", { name: "Restore original", exact: true }).click();
    await expect.poll(labels).toEqual(before);
    await page.getByRole("spinbutton", { name: "Start (s)", exact: true }).fill("0.5");
    await expect(page.getByText("1.500 s selected of 2.000 s.", { exact: false })).toBeVisible();
    await expect(apply).toBeEnabled({ timeout: 20000 });
    await expect(
      page.getByRole("img", { name: "Vibrotactile loudness estimate", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    expect(errors).toEqual([]);
  });
