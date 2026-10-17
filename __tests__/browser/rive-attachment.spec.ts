import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const id = localStorage.getItem("buzzzz.lastProject");
    if (!id) throw new Error("Missing sample project id");
    const record = JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null");
    const project = record.project;
    const attachment = await new Promise<unknown>((resolve, reject) => {
      const opening = indexedDB.open("buzzzz-media");
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        const db = opening.result;
        const tx = db.transaction("attachments");
        const request = tx.objectStore("attachments").get([id, "*project", "rive"]);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      };
    });
    return {
      rivePresetId: project.rivePresetId,
      riveConfig: project.riveConfig,
      riveStateMachine: project.riveStateMachine,
      map: project.map,
      attachment,
    };
  });
}

async function sample(page: Page) {
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Create sample project", exact: true }).click();
  await page.getByRole("button", { name: "FanfareSound", exact: true }).click();
}

async function dropRive(page: Page) {
  const bytes = await readFile(
    "apps/studio/src/features/project/starter/rive/dexHeadoutIntegration.riv",
  );
  const transfer = await page.evaluateHandle(
    (bytes) => {
      const data = new DataTransfer();
      data.items.add(new File([new Uint8Array(bytes)], "replacement.riv"));
      return data;
    },
    [...bytes],
  );
  await page.locator(".shell").dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
}

for (const mode of [
  "storage-failure",
  "metadata-failure",
  "selection-change",
  "overlap-cancel",
] as const) {
  test(`a Rive ${mode} preserves the previous owner, source config and stored attachment`, async ({
    page,
  }) => {
    let release: (() => void) | undefined;
    let pending = false;
    let queued = 0;
    await page.exposeFunction("__queuedRiveAttachment", () => queued++);
    await page.exposeFunction(
      "__delayRiveAttachment",
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
          pending = true;
        }),
    );
    await page.route(/\/src\/features\/media\/repository\.ts(?:\?.*)?$/, async (route) => {
      const response = await route.fetch();
      let source = await response.text();
      if (mode === "storage-failure") {
        const marker = "async function addMedia(props) {";
        if (!source.includes(marker)) throw new Error("Actual media add function missing");
        source = source.replace(
          marker,
          `${marker} if(props.file.name === "replacement.riv") throw new DOMException("Injected storage failure", "QuotaExceededError");`,
        );
      } else if (mode !== "metadata-failure") {
        const marker = /return \{\s*assetId,\s*rollback\s*\};/;
        if (!marker.test(source)) throw new Error("Actual attachment commit receipt missing");
        source = source.replace(
          marker,
          "await globalThis.__delayRiveAttachment(); return { assetId, rollback };",
        );
      }
      await route.fulfill({ response, body: source });
    });
    if (mode === "overlap-cancel")
      await page.route(/\/src\/features\/media\/riveTransfer\.ts(?:\?.*)?$/, async (route) => {
        const response = await route.fetch();
        const source = await response.text();
        const marker = "const previous = pending.get(projectId) ?? Promise.resolve();";
        if (!source.includes(marker)) throw new Error("Actual per-project queue missing");
        await route.fulfill({
          response,
          body: source.replace(marker, `globalThis.__queuedRiveAttachment(); ${marker}`),
        });
      });
    await sample(page);
    const original = await snapshot(page);
    if (mode === "metadata-failure")
      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key: string, value: string) {
          if (key.startsWith("buzzzz.project."))
            throw new DOMException("Injected project storage failure", "QuotaExceededError");
          original.call(this, key, value);
        };
      });
    await dropRive(page);
    if (mode === "storage-failure") {
      await expect(page.getByRole("alert")).toContainText("Browser storage is full");
    } else if (mode === "metadata-failure") {
      await expect(page.locator(".save-status")).toContainText("Not saved");
    } else {
      await expect.poll(() => pending).toBe(true);
      const staged = await snapshot(page);
      expect(staged.rivePresetId).toBe(original.rivePresetId);
      expect(staged.riveConfig).toEqual(original.riveConfig);
      if (mode === "overlap-cancel") {
        await dropRive(page);
        await expect.poll(() => queued).toBe(2);
      }
      await page.getByRole("button", { name: "JustHaptics", exact: true }).click();
      if (!release) throw new Error("Missing delayed attachment");
      release();
    }
    await expect.poll(() => snapshot(page)).toEqual(original);
    await page.reload();
    expect(await snapshot(page)).toEqual(original);
    await expect(page.locator(".rive-panel")).toHaveCount(0);
    await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
    await expect(
      page.locator(".rive-panel").getByRole("button", { name: "Fire hapticEntry", exact: true }),
    ).toBeVisible();
  });
}

for (const boundary of ["file-parse", "library-read"] as const) {
  test(`returning to a pattern cannot revive an old Rive ${boundary}`, async ({ page }) => {
    let release: (() => void) | undefined;
    let pending = false;
    let finished = false;
    await page.exposeFunction("__RiveOperationFinished", () => {
      finished = true;
    });
    await page.route(/\/src\/app\/useStudioFiles\.ts(?:\?.*)?$/, async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      if (!source.includes("await readFile(file);") || !/\battachMediaAsset,/.test(source))
        throw new Error("Actual media import/attach callers missing");
      await route.fulfill({
        response,
        body: source
          .replace(
            "await readFile(file);",
            "await readFile(file); globalThis.__RiveOperationFinished();",
          )
          .replace(
            /\battachMediaAsset,/,
            "attachMediaAsset: async (...args) => { try { return await attachMediaAsset(...args); } finally { globalThis.__RiveOperationFinished(); } },",
          ),
      });
    });
    await page.exposeFunction(
      "__holdRiveDecode",
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
          pending = true;
        }),
    );
    if (boundary === "file-parse") {
      await page.route(/\/src\/features\/imports\/readImport\.ts(?:\?.*)?$/, async (route) => {
        const response = await route.fetch();
        const source = await response.text();
        const marker = "async function readImport(file) {";
        if (!source.includes(marker)) throw new Error("Actual import preprocessing missing");
        await route.fulfill({
          response,
          body: source.replace(
            marker,
            `${marker} if(file.name === "replacement.riv") await globalThis.__holdRiveDecode();`,
          ),
        });
      });
    } else {
      await page.route(/\/src\/features\/media\/repository\.ts(?:\?.*)?$/, async (route) => {
        const response = await route.fetch();
        const source = await response.text();
        const marker = "return new File([blob], item.originalName";
        if (!source.includes(marker)) throw new Error("Actual persisted media read missing");
        await route.fulfill({
          response,
          body: source.replace(
            marker,
            `if(globalThis.__holdLibraryRead && item.kind === "rive") await globalThis.__holdRiveDecode(); ${marker}`,
          ),
        });
      });
    }
    await sample(page);
    await expect(page.getByRole("button", { name: "DexTourLoader", exact: true })).toContainText(
      "Rive · system haptics",
    );
    const original = await snapshot(page);
    if (boundary === "file-parse") await dropRive(page);
    else {
      await page.evaluate("globalThis.__holdLibraryRead = true");
      await page.getByRole("button", { name: "Media", exact: true }).click();
      await page
        .locator(".media-item")
        .filter({ hasText: "dexHeadoutIntegration.riv" })
        .click({ button: "right" });
      await page.getByRole("menuitem", { name: "Add to canvas", exact: true }).click();
    }
    await expect.poll(() => pending).toBe(true);
    if (boundary === "library-read")
      await page.getByRole("button", { name: "Patterns", exact: true }).click();
    await page.getByRole("button", { name: "JustHaptics", exact: true }).click();
    await page.getByRole("button", { name: "FanfareSound", exact: true }).click();
    if (!release) throw new Error("Missing delayed Rive read");
    release();
    await expect.poll(() => finished).toBe(true);
    await expect.poll(() => snapshot(page)).toEqual(original);
    await page.reload();
    expect(await snapshot(page)).toEqual(original);
    await expect(page.locator(".rive-panel")).toHaveCount(0);
  });
}

test("removing the attached Rive file clears only its ownership and source configuration", async ({
  page,
}) => {
  await sample(page);
  const original = await snapshot(page);
  await page.getByRole("button", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Remove fanfaresound.mp3", exact: true }).click();
  await expect(page.locator(".media-item")).toHaveCount(2);
  expect(await snapshot(page)).toEqual(original);
  await page.getByRole("button", { name: "Remove dexHeadoutIntegration.riv", exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).rivePresetId).toBeNull();
  const removed = await snapshot(page);
  expect(removed.riveConfig).toBeUndefined();
  expect(removed.riveStateMachine).toBeUndefined();
  expect(removed.map).toEqual({});
  expect(removed.attachment).toBeNull();
  await page.reload();
  expect(await snapshot(page)).toEqual(removed);
  await page.getByRole("button", { name: "DexTourLoader", exact: true }).click();
  await expect(page.locator(".rive-panel")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "DexTourLoader", exact: true })).not.toContainText(
    "Rive · system haptics",
  );
});
