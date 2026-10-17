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
    await page.addInitScript(() => localStorage.setItem("buzzzz.mobile-notice-dismissed", "1"));
    await page.goto("/");
    const chart = page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
    await expect(chart).toBeVisible();
    await expect(chart).not.toHaveAttribute("data-readonly", "true");
    const handles = chart.getByRole("button");
    const labels = () =>
      handles.evaluateAll((items) => items.map((item) => item.getAttribute("aria-label")));
    const before = await labels();
    await page.getByRole("tab", { name: "sound", exact: true }).click();
    await page
      .getByLabel("Audio file", { exact: true })
      .setInputFiles({ name: "test-beats.wav", mimeType: "audio/wav", buffer: wav() });
    const approaches = page.getByRole("list", { name: "Approaches", exact: true });
    const apply = approaches.locator(".audio-candidate", { hasText: "RMS envelope" });
    await expect(apply).toBeEnabled({ timeout: 20000 });
    await expect(page.getByRole("img", { name: "Audio waveform" })).toBeVisible();
    await expect(page.locator(".audio-candidate")).toHaveCount(9);
    await expect(apply).toContainText(/\d+ points · \d+ms/);
    await apply.click();
    await expect(apply).toHaveAttribute("aria-pressed", "true");
    await expect.poll(labels).not.toEqual(before);
    const applied = await labels();
    const release = page.getByRole("spinbutton", { name: "Release", exact: true });
    await expect(release).toHaveValue("80");
    await page.getByRole("spinbutton", { name: "Floor", exact: true }).fill("-25");
    await expect.poll(labels, { timeout: 20000 }).not.toEqual(applied);
    await expect(apply).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Restore my pattern", exact: true }).click();
    await expect.poll(labels).toEqual(before);
    await expect(
      page.getByRole("button", { name: "Restore my pattern", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Open trimming tool", exact: true }).click();
    const trim = page.getByRole("dialog", { name: "Audio trim", exact: true });
    await trim.getByRole("spinbutton", { name: "Start", exact: true }).fill("500");
    await expect(trim.getByText("1500 ms", { exact: true })).toBeVisible();
    await trim.getByRole("button", { name: "Apply trim", exact: true }).click();
    await expect(trim).not.toBeVisible();
    await expect(apply).toBeEnabled({ timeout: 20000 });
    await page.getByRole("switch", { name: "Band energy", exact: true }).check();
    await expect(page.getByRole("spinbutton", { name: "High frequency", exact: true })).toHaveValue(
      "250",
    );
    await expect(page.getByRole("img", { name: "Band energy", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    expect(errors).toEqual([]);
  });

for (const theme of ["Light", "Dark"]) {
  test(`${theme} sound inspector controls and staged trim stay usable`, async ({ page }) => {
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    await page.goto("/");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name: theme, exact: true }).click();
    await page.getByRole("tab", { name: "sound", exact: true }).click();
    const sound = page.getByRole("region", { name: "Sound tools", exact: true });
    await expect(
      sound.getByRole("heading", { name: "No audio attached", exact: true }),
    ).toBeVisible();
    await expect(sound.getByLabel("Audio file", { exact: true })).not.toBeVisible();
    await sound.getByRole("button", { name: "Open Media panel", exact: true }).click();
    await expect(page.getByRole("region", { name: "Media library", exact: true })).toBeVisible();
    await sound
      .getByLabel("Audio file", { exact: true })
      .setInputFiles({ name: "inspector-beats.wav", mimeType: "audio/wav", buffer: wav() });
    const rms = sound.locator(".audio-candidate", { hasText: "RMS envelope" });
    await expect(rms).toBeEnabled({ timeout: 20000 });
    await expect(sound.getByRole("heading", { name: "Track", exact: true })).toBeVisible();
    await expect(sound.getByText("0:02", { exact: true })).toBeVisible();
    await sound.getByRole("spinbutton", { name: "Analysis frame", exact: true }).fill("25");
    await expect(
      sound.getByRole("slider", { name: "Analysis frame slider", exact: true }),
    ).toHaveValue("25");
    await sound.getByRole("button", { name: "True value", exact: true }).click();
    await expect(sound.getByRole("button", { name: "True value", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await sound.getByRole("switch", { name: "Roughness (asper)", exact: true }).check();
    await expect(sound.getByText("full scale 8 asper", { exact: true })).toBeVisible();
    await sound.getByRole("switch", { name: "dB curve", exact: true }).check();
    await expect(sound.getByRole("switch", { name: "dB curve", exact: true })).toBeChecked();
    await expect(
      sound.getByRole("spinbutton", { name: "Gamma (perceptual)", exact: true }),
    ).not.toBeVisible();
    await sound.locator(".sound-generation-settings > summary").click();
    await sound.getByRole("button", { name: "Increase contrast (anti-mush)", exact: true }).click();
    await expect(
      sound.getByRole("spinbutton", { name: "Contrast (anti-mush)", exact: true }),
    ).toHaveValue("0.35");
    await sound.getByRole("button", { name: "Increase silence floor", exact: true }).click();
    await expect(sound.getByRole("spinbutton", { name: "Silence floor", exact: true })).toHaveValue(
      "0.055",
    );
    await sound.getByRole("button", { name: "Reset to defaults", exact: true }).click();
    await expect(sound.getByRole("spinbutton", { name: "Silence floor", exact: true })).toHaveValue(
      "0.050",
    );
    await sound.getByRole("button", { name: "Open trimming tool", exact: true }).click();
    const trim = page.getByRole("dialog", { name: "Audio trim", exact: true });
    await expect(trim.getByRole("button", { name: "Apply trim", exact: true })).toBeDisabled();
    await trim.getByRole("spinbutton", { name: "Start", exact: true }).fill("500");
    await page.keyboard.press("Escape");
    await expect(trim).not.toBeVisible();
    await sound.getByRole("button", { name: "Open trimming tool", exact: true }).click();
    await expect(trim.getByRole("spinbutton", { name: "Start", exact: true })).toHaveValue("0");
    await trim.getByRole("spinbutton", { name: "Start", exact: true }).fill("1000");
    await trim.getByRole("spinbutton", { name: "End", exact: true }).fill("1500");
    await expect(trim.getByText("500 ms", { exact: true })).toBeVisible();
    await trim.getByRole("button", { name: "Apply trim", exact: true }).click();
    await expect(trim).not.toBeVisible();
    await expect(sound.getByText("from 1000 ms", { exact: true })).toBeVisible();
    await expect(rms).toBeEnabled({ timeout: 20000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const accessibility = await new AxeBuilder({ page })
      .include(".sound-panel")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });
}
