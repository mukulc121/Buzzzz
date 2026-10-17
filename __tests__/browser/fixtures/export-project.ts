import { patternTitle } from "./pattern-title";
import { expect, type Page } from "@playwright/test";

export async function openExportProject(page: Page) {
  await page.addInitScript(() => {
    const pattern = { discretePattern: [], continuousPattern: { amplitude: [], frequency: [] } };
    const record = {
      id: "export-project",
      name: "Demo pack",
      createdAt: 1,
      updatedAt: 1,
      revision: 0,
      project: {
        presets: [
          { id: "one", name: "First", pattern },
          {
            id: "two",
            name: "Second",
            pattern,
            editor: { markers: [], range: null, durationMs: 1000 },
          },
        ],
        map: { A: "one", B: "two" },
      },
    };
    localStorage.setItem("buzzzz.onboarding.seen", "true");
    localStorage.setItem("buzzzz.project.export-project", JSON.stringify(record));
    localStorage.setItem("buzzzz.lastProject", "export-project");
  });
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.goto("/studio/projects/export-project");
  await expect(patternTitle(page)).toHaveText("First");
  if ((page.viewportSize()?.width ?? 1440) <= 768)
    await page
      .locator(".mobile-notice")
      .getByRole("button", { name: "Dismiss", exact: true })
      .click();
  return page.locator('[data-tour="inspector-export"]');
}

export async function seedExportMedia(page: Page) {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("buzzzz-media", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction(["items", "blobs", "attachments"], "readwrite");
    const completed = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    const animation = new Blob(
      [JSON.stringify({ v: "5.12.2", fr: 60, ip: 0, op: 60, w: 100, h: 100, layers: [] })],
      { type: "application/json" },
    );
    for (const kind of ["audio", "animation"]) {
      const id = `export-${kind}`;
      const name = kind === "audio" ? "missing.wav" : "animation.json";
      tx.objectStore("items").put({
        id,
        projectId: "export-project",
        kind,
        name,
        originalName: name,
        type: kind === "audio" ? "audio/wav" : "application/json",
        size: animation.size,
        lastModified: 1,
        addedAt: 1,
        sha256: kind,
      });
      tx.objectStore("attachments").put({
        projectId: "export-project",
        scope: "two",
        kind,
        assetId: id,
        trim: null,
      });
      if (kind === "animation") tx.objectStore("blobs").put({ id, blob: animation });
    }
    await completed;
    db.close();
  });
}
