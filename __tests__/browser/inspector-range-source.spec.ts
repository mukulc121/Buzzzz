import { expect, test, type Page } from "@playwright/test";
import type { IPresetEditor } from "@buzzzz/core";

async function openRangeProject(page: Page, range: IPresetEditor["range"] = null) {
  await page.addInitScript((range) => {
    const key = "buzzzz.project.inspector-range";
    if (localStorage.getItem(key)) return;
    localStorage.setItem("buzzzz.onboarding.seen", "true");
    localStorage.setItem("buzzzz.lastProject", "inspector-range");
    localStorage.setItem(
      key,
      JSON.stringify({
        id: "inspector-range",
        name: "Inspector range",
        createdAt: 1,
        updatedAt: 1,
        revision: 0,
        project: {
          presets: [
            {
              id: "range",
              name: "Range",
              pattern: { discretePattern: [], continuousPattern: { amplitude: [], frequency: [] } },
              editor: { markers: [], range, durationMs: 1000 },
            },
          ],
          map: {},
        },
      }),
    );
  }, range);
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/studio/projects/inspector-range");
  const inspector = page.getByRole("complementary", { name: "Inspector", exact: true });
  await expect(
    inspector.getByRole("spinbutton", { name: "Playback range end", exact: true }),
  ).toHaveValue("1000");
  return inspector;
}

function audioFile() {
  const rate = 8000;
  const count = rate * 2;
  const bytes = Buffer.alloc(44 + count * 2);
  bytes.write("RIFF");
  bytes.writeUInt32LE(36 + count * 2, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(count * 2, 40);
  return { name: "range.wav", mimeType: "audio/wav", buffer: bytes };
}

test("range fields follow the source 10 ms steps and preset bounds", async ({ page }) => {
  const inspector = await openRangeProject(page);
  const start = inspector.getByRole("spinbutton", { name: "Playback range start", exact: true });
  const end = inspector.getByRole("spinbutton", { name: "Playback range end", exact: true });
  const reset = inspector.getByRole("button", { name: "Play the whole preset", exact: true });
  await expect(reset).toBeDisabled();
  await inspector.getByRole("button", { name: "Decrease playback range end", exact: true }).click();
  await expect(end).toHaveValue("990");
  await end.fill("2000");
  await expect(end).toHaveValue("1000");
  await expect(reset).toBeDisabled();
  await inspector
    .getByRole("button", { name: "Increase playback range start", exact: true })
    .click();
  await expect(start).toHaveValue("10");
  await end.fill("0");
  await expect(end).toHaveValue("20");
  await start.fill("9999");
  await expect(start).toHaveValue("10");
  await start.fill("5.6");
  await expect(start).toHaveValue("6");
  await end.fill("15.1");
  await expect(end).toHaveValue("16");
  await page.reload();
  await expect(start).toHaveValue("6");
  await expect(end).toHaveValue("16");
  await reset.click();
  await expect(start).toHaveValue("0");
  await expect(end).toHaveValue("1000");
  await expect(reset).toBeDisabled();
});

test("an explicit full range already counts as the whole preset without a mount-time write", async ({
  page,
}) => {
  const inspector = await openRangeProject(page, { start: 0, end: 1000 });
  const read = () => page.evaluate(() => localStorage.getItem("buzzzz.project.inspector-range"));
  const before = await read();
  await expect(
    inspector.getByRole("button", { name: "Play the whole preset", exact: true }),
  ).toBeDisabled();
  await page.reload();
  expect(await read()).toBe(before);
});

test("range limits include the attached audio window and animation duration", async ({ page }) => {
  const inspector = await openRangeProject(page);
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await page.getByLabel("Audio file", { exact: true }).setInputFiles(audioFile());
  await expect(page.getByRole("button", { name: "Open trimming tool", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  const end = inspector.getByRole("spinbutton", { name: "Playback range end", exact: true });
  await expect(end).toHaveValue("2000");
  await expect(end).toHaveAttribute("max", "2000");
  await page.getByRole("tab", { name: "sound", exact: true }).click();
  await page.getByRole("button", { name: "Open trimming tool", exact: true }).click();
  const trim = page.getByRole("dialog", { name: "Audio trim", exact: true });
  await trim.getByRole("spinbutton", { name: "Start", exact: true }).fill("500");
  await trim.getByRole("spinbutton", { name: "End", exact: true }).fill("1500");
  await trim.getByRole("button", { name: "Apply trim", exact: true }).click();
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await expect(end).toHaveValue("1000");
  await expect(end).toHaveAttribute("max", "1000");
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  await page.getByLabel("Lottie file", { exact: true }).setInputFiles({
    name: "range-animation.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ v: "5.12.2", fr: 60, ip: 0, op: 180, w: 100, h: 100, layers: [] }),
    ),
  });
  await page.getByRole("tab", { name: "inspector", exact: true }).click();
  await expect(end).toHaveValue("3000");
  await expect(end).toHaveAttribute("max", "3000");
  await end.fill("4000");
  await expect(end).toHaveValue("3000");
});
