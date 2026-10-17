import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { unzipSync } from "fflate";
import { openExportProject, seedExportMedia } from "./fixtures/export-project";

async function downloadBundle(page: Page, section: Locator, label: string, filename: string) {
  const waiting = page.waitForEvent("download");
  await section.getByRole("button", { name: label, exact: true }).click();
  const download = await waiting;
  expect(download.suggestedFilename()).toBe(filename);
  const path = await download.path();
  if (!path) throw new Error("Missing exported archive");
  const files = unzipSync(new Uint8Array(await readFile(path)));
  return { files, manifest: JSON.parse(new TextDecoder().decode(files["manifest.json"])) };
}

test("export settings select real patterns and prune excluded trigger mappings", async ({
  page,
}) => {
  const section = await openExportProject(page);
  await expect(
    section.getByRole("button", { name: "Export all 2 patterns", exact: true }),
  ).toBeEnabled();
  await expect(section.getByRole("checkbox")).toHaveCount(0);
  await section.locator("summary").click();
  await expect(section.getByRole("checkbox", { name: "First", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(section.locator(".export-preset-tag")).toHaveText("open");
  await section.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(
    section.getByRole("button", { name: "Export 0 patterns", exact: true }),
  ).toBeDisabled();
  await section.getByRole("checkbox", { name: "First", exact: true }).click();
  const result = await downloadBundle(page, section, "Export 1 pattern", "first.pulsar");
  expect(result.manifest.name).toBe("First");
  expect(result.manifest.presets).toHaveLength(1);
  expect(result.manifest.presets[0].name).toBe("First");
  expect(result.manifest.buzzzz.map).toEqual({ A: "one" });
  expect(Object.keys(result.files).filter((path) => path.startsWith("haptics/"))).toHaveLength(1);
  await section.getByRole("button", { name: "Select all", exact: true }).click();
  await expect(
    section.getByRole("button", { name: "Export all 2 patterns", exact: true }),
  ).toBeEnabled();
});

test("file toggles filter stored attachments before reading an unavailable excluded audio blob", async ({
  page,
}) => {
  const section = await openExportProject(page);
  await seedExportMedia(page);
  await section.locator("summary").click();
  const second = section.getByRole("checkbox", { name: "Second", exact: true });
  await expect(second).toContainText("+ audio, animation");
  await section.getByRole("checkbox", { name: "First", exact: true }).click();
  await section.getByRole("button", { name: "Export 1 pattern", exact: true }).click();
  await expect(section.getByRole("alert")).toHaveText("That media file no longer exists.");
  await section.getByRole("switch", { name: "Include audio files", exact: true }).uncheck();
  await expect(second).toContainText("+ animation");
  const animation = await downloadBundle(page, section, "Export 1 pattern", "second.pulsar");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(Object.keys(animation.files).filter((path) => path.startsWith("audio/"))).toHaveLength(0);
  expect(Object.keys(animation.files).filter((path) => path.startsWith("animation/"))).toHaveLength(
    1,
  );
  expect(animation.manifest.buzzzz.map).toEqual({ B: "two" });
  await section.getByRole("switch", { name: "Include animation files", exact: true }).uncheck();
  const haptics = await downloadBundle(page, section, "Export 1 pattern", "second.pulsar");
  expect(Object.keys(haptics.files).some((path) => /^(audio|animation)\//.test(path))).toBe(false);
  expect(haptics.manifest.presets[0].duration).toBe(1000);
});

for (const width of [390, 1440])
  test(`export settings fit and remain accessible in both themes at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1100 });
    const section = await openExportProject(page);
    await section.locator("summary").click();
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.waitForFunction(
        (value) => document.documentElement.dataset.theme === value,
        theme,
      );
      const result = await new AxeBuilder({ page })
        .include('[data-tour="inspector-export"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
    }
  });
