import { expect, test, type Page } from "@playwright/test";
import type { Project } from "@buzzzz/core";
import { strToU8, zipSync } from "fflate";
import bounce from "../../apps/preview/src/features/demos/lottie/bounce.json" with { type: "json" };
import { patternTitle } from "./fixtures/pattern-title";

async function storedProject(page: Page) {
  return page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    const record: { project: Project } = JSON.parse(
      localStorage.getItem(`buzzzz.project.${id}`) ?? "null",
    );
    return record.project;
  });
}

async function editFirstPoint(page: Page) {
  const point = page.getByRole("button", { name: /^Intensity point/ }).first();
  const before = await point.getAttribute("aria-label");
  await point.focus();
  await point.press("ArrowUp");
  await expect(point).not.toHaveAttribute("aria-label", before ?? "");
}

for (const theme of ["Light", "Dark"]) {
  test(`${theme} animation approaches protect edits on restore and keep the selected card`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    const name = await patternTitle(page).innerText();
    const original = (await storedProject(page)).presets.find((preset) => preset.name === name);
    if (!original) throw new Error("Missing original preset");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name: theme, exact: true }).click();
    await page.getByRole("tab", { name: "animation", exact: true }).click();
    const panel = page.getByRole("region", { name: "Animation tools", exact: true });
    await panel
      .getByLabel("Lottie file", { exact: true })
      .setInputFiles("apps/preview/src/features/demos/lottie/bounce.json");
    const restore = panel.getByRole("button", { name: "Restore my pattern", exact: true });
    await expect(restore).toBeDisabled();
    const hybrid = panel.getByRole("button", {
      name: "Apply Hybrid (energy + impacts)",
      exact: true,
    });
    await expect(hybrid).toBeEnabled();
    await hybrid.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(hybrid).toHaveAttribute("aria-pressed", "true");
    await editFirstPoint(page);
    const edited = (await storedProject(page)).presets.find(
      (preset) => preset.id === original.id,
    )?.pattern;
    expect(edited).toBeDefined();
    await page.getByRole("tab", { name: "inspector", exact: true }).click();
    await page.getByRole("tab", { name: "sound", exact: true }).click();
    await page.getByRole("tab", { name: "animation", exact: true }).click();
    await expect(hybrid).toHaveAttribute("aria-pressed", "true");
    await expect(panel.getByText("You have edited", { exact: false })).toContainText(
      "Hybrid (energy + impacts)",
    );
    await restore.click();
    const dialog = page.getByRole("dialog", { name: "You have unsaved changes", exact: true });
    await expect(dialog).toContainText("Restoring your own pattern replaces the whole pattern.");
    await expect(dialog.getByRole("button")).toHaveText(["", "Cancel", "Discard", "Keep a copy"]);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(
      (await storedProject(page)).presets.find((preset) => preset.id === original.id)?.pattern,
    ).toEqual(edited);
    await restore.click();
    await dialog.getByRole("button", { name: "Discard", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(restore).toBeDisabled();
    expect(
      (await storedProject(page)).presets.find((preset) => preset.id === original.id)?.pattern,
    ).toEqual(original.pattern);
    expect(errors).toEqual([]);
  });
}

test("Keep a copy preserves edited animation points before switching and before restoring", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const name = await patternTitle(page).innerText();
  const original = (await storedProject(page)).presets.find((preset) => preset.name === name);
  if (!original) throw new Error("Missing original preset");
  await page.getByRole("tab", { name: "animation", exact: true }).click();
  const panel = page.getByRole("region", { name: "Animation tools", exact: true });
  await panel
    .getByLabel("Lottie file", { exact: true })
    .setInputFiles("apps/preview/src/features/demos/lottie/bounce.json");
  const hybrid = panel.getByRole("button", {
    name: "Apply Hybrid (energy + impacts)",
    exact: true,
  });
  await expect(hybrid).toBeEnabled();
  await hybrid.click();
  await editFirstPoint(page);
  const edited = (await storedProject(page)).presets.find(
    (preset) => preset.id === original.id,
  )?.pattern;
  const energy = panel.getByRole("button", { name: "Apply Motion energy", exact: true });
  await energy.click();
  const dialog = page.getByRole("dialog", { name: "You have unsaved changes", exact: true });
  await expect(dialog).toContainText("Switching to Motion energy replaces the whole pattern.");
  await dialog.getByRole("button", { name: "Keep a copy", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(patternTitle(page)).toHaveText(name);
  await expect(energy).toHaveAttribute("aria-pressed", "true");
  const firstCopy = (await storedProject(page)).presets.find(
    (preset) => preset.name === `${name} copy`,
  );
  expect(firstCopy?.pattern).toEqual(edited);
  expect(firstCopy?.id).not.toBe(original.id);
  await editFirstPoint(page);
  const editedEnergy = (await storedProject(page)).presets.find(
    (preset) => preset.id === original.id,
  )?.pattern;
  await panel.getByRole("button", { name: "Restore my pattern", exact: true }).click();
  await dialog.getByRole("button", { name: "Keep a copy", exact: true }).click();
  const project = await storedProject(page);
  expect(project.presets.find((preset) => preset.id === original.id)?.pattern).toEqual(
    original.pattern,
  );
  expect(
    project.presets
      .filter((preset) => preset.name === `${name} copy`)
      .map((preset) => preset.pattern),
  ).toEqual([edited, editedEnergy]);
  await expect(patternTitle(page)).toHaveText(name);
});

for (const packaged of [false, true])
  test(`animation selection survives preset changes and replacement with ${packaged ? "packaged images" : "JSON"}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    const firstName = await patternTitle(page).innerText();
    const original = (await storedProject(page)).presets.find(
      (preset) => preset.name === firstName,
    );
    if (!original) throw new Error("Missing original preset");
    await page.getByRole("tab", { name: "animation", exact: true }).click();
    const panel = page.getByRole("region", { name: "Animation tools", exact: true });
    const file = panel.getByLabel("Lottie file", { exact: true });
    const initialName = packaged ? "bounce.lottie" : "bounce.json";
    const initial = packaged
      ? {
          name: initialName,
          mimeType: "application/zip+dotlottie",
          buffer: Buffer.from(
            zipSync({
              "manifest.json": strToU8(
                JSON.stringify({ version: "2", animations: [{ id: "bounce" }] }),
              ),
              "a/bounce.json": strToU8(
                JSON.stringify({
                  ...bounce,
                  assets: [{ id: "image", p: "image.png", u: "../images/" }],
                }),
              ),
              "i/image.png": Buffer.from(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
                "base64",
              ),
            }),
          ),
        }
      : "apps/preview/src/features/demos/lottie/bounce.json";
    await file.setInputFiles(initial);
    const hybrid = panel.getByRole("button", {
      name: "Apply Hybrid (energy + impacts)",
      exact: true,
    });
    await expect(hybrid).toBeEnabled();
    await hybrid.click();
    await editFirstPoint(page);
    const edited = (await storedProject(page)).presets.find(
      (preset) => preset.id === original.id,
    )?.pattern;
    const patterns = page.getByRole("complementary", { name: "Project patterns", exact: true });
    await patterns.getByRole("button", { name: "New pattern", exact: true }).click();
    const rename = page.getByRole("textbox", { name: "Pattern name", exact: true });
    await rename.fill("Other animation");
    await rename.press("Enter");
    const replacement = {
      name: "other.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ ...bounce, nm: "other-motion", w: 300 })),
    };
    await file.setInputFiles(replacement);
    const energy = panel.getByRole("button", { name: "Apply Motion energy", exact: true });
    await expect(energy).toBeEnabled();
    await energy.click();
    const other = (await storedProject(page)).presets.find(
      (preset) => preset.name === "Other animation",
    );
    if (!other) throw new Error("Missing second preset");
    await patterns.getByRole("button", { name: firstName, exact: true }).click();
    await expect(panel.locator("dd").first()).toHaveText(initialName);
    await expect(hybrid).toHaveAttribute("aria-pressed", "true");
    expect(
      (await storedProject(page)).presets.find((preset) => preset.id === original.id)?.pattern,
    ).toEqual(edited);
    await panel.getByRole("button", { name: "Restore my pattern", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "You have unsaved changes", exact: true });
    await expect(dialog).toContainText("Restoring your own pattern replaces the whole pattern.");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(
      (await storedProject(page)).presets.find((preset) => preset.id === other.id)?.pattern,
    ).toEqual(other.pattern);
    await file.setInputFiles(replacement);
    await expect(panel.locator("dd").first()).toHaveText("other.json");
    await expect(panel.locator(".animation-candidates .audio-candidate")).toHaveCount(5);
    await expect(
      panel.getByRole("button", { name: "Restore my pattern", exact: true }),
    ).toBeDisabled();
    expect(
      (await storedProject(page)).presets.find((preset) => preset.id === original.id)?.pattern,
    ).toEqual(edited);
    expect(errors).toEqual([]);
  });
