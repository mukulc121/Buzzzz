import { expect, test } from "@playwright/test";

const STUDIO = "http://127.0.0.1:5174";

for (const stage of ["success", "second-attachment", "catalog-quota"] as const)
  test(`project import is atomic at ${stage}`, async ({ page }) => {
    await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) =>
      route.fulfill({ contentType: "application/javascript", body: "" }),
    );
    await page.goto(STUDIO);
    const result = await page.evaluate(async (stage) => {
      const modelPath = "/src/features/project/model.ts";
      const recordsPath = "/src/features/project/repository.ts";
      const mediaPath = "/src/features/media/repository.ts";
      const dbPath = "/src/features/media/db.ts";
      const importPath = "/src/features/project/importProject.ts";
      const [model, records, media, db, importer] = await Promise.all([
        import(modelPath),
        import(recordsPath),
        import(mediaPath),
        import(dbPath),
        import(importPath),
      ]);
      const active = model.newRecord("Existing private project", model.starterProject());
      const storageError = records.writeRecord(active);
      if (storageError) throw new Error(storageError);
      records.rememberLast(active.id);
      const privateFile = await media.addMedia({
        projectId: active.id,
        kind: "audio",
        file: new File(["private audio"], "private.wav", { type: "audio/wav" }),
      });
      await media.attachMedia({
        projectId: active.id,
        presetId: active.project.presets[0].id,
        assetId: privateFile.id,
      });
      const storage = () =>
        Object.fromEntries(
          Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)]),
        );
      const keys = () =>
        db.transact(["items", "blobs", "attachments"], "readonly", (tx: IDBTransaction) =>
          Promise.all(
            ["items", "blobs", "attachments"].map(async (name) => ({
              name,
              keys: await db.settle(tx.objectStore(name).getAllKeys()),
            })),
          ),
        );
      const beforeStorage = storage();
      const beforeKeys = await keys();
      const project = model.starterProject();
      project.presets.push({
        ...structuredClone(project.presets[0]),
        id: "second",
        name: "Second",
      });
      const input = {
        name: "Imported project",
        project,
        media: [
          {
            presetId: project.presets[0].id,
            kind: "audio",
            file: new File(["imported audio"], "import.wav", { type: "audio/wav" }),
            window: { startMs: 100, durationMs: 500 },
          },
          {
            presetId: "second",
            kind: "animation",
            file: new File(['{"fr":30,"ip":0,"op":30}'], "import.json", {
              type: "application/json",
            }),
          },
        ],
        riv: null,
      };
      const originalPut = IDBObjectStore.prototype.put;
      const originalSetItem = Storage.prototype.setItem;
      const inspectionDb = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("buzzzz-media");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      let attachmentWrites = 0;
      let persistedAtCatalog = Promise.resolve<unknown>(null);
      Object.defineProperty(IDBObjectStore.prototype, "put", {
        configurable: true,
        writable: true,
        value: function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
          if (
            this.name === "attachments" &&
            value &&
            typeof value === "object" &&
            "projectId" in value &&
            value.projectId !== active.id &&
            "kind" in value &&
            value.kind === "animation"
          ) {
            attachmentWrites++;
            if (stage === "second-attachment")
              throw new DOMException("Forced attachment quota", "QuotaExceededError");
          }
          return originalPut.call(this, value, key);
        },
      });
      Object.defineProperty(Storage.prototype, "setItem", {
        configurable: true,
        writable: true,
        value: function (this: Storage, key: string, value: string) {
          if (
            this === localStorage &&
            key.startsWith("buzzzz.project.") &&
            !key.endsWith(active.id)
          ) {
            if (stage === "catalog-quota") {
              persistedAtCatalog = new Promise((resolve, reject) => {
                const tx = inspectionDb.transaction(["items", "blobs", "attachments"], "readonly");
                const items = tx.objectStore("items").getAll();
                const blobs = tx.objectStore("blobs").getAllKeys();
                const attachments = tx.objectStore("attachments").getAll();
                tx.oncomplete = () =>
                  resolve({
                    items: items.result.filter((item) => item.projectId !== active.id).length,
                    blobs: blobs.result.filter((id) => id !== privateFile.id).length,
                    attachments: Object.fromEntries(
                      attachments.result
                        .filter((item) => item.projectId !== active.id)
                        .map((item) => [item.kind, item.trim]),
                    ),
                  });
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
              });
              throw new DOMException("Forced catalog quota", "QuotaExceededError");
            }
          }
          return originalSetItem.call(this, key, value);
        },
      });
      let importedId: string | null = null;
      let failure: string | null = null;
      try {
        importedId = await importer.importProject(input);
      } catch (error) {
        failure = error instanceof Error ? error.message : "Import failed";
      } finally {
        IDBObjectStore.prototype.put = originalPut;
        Storage.prototype.setItem = originalSetItem;
      }
      const importedFiles = importedId ? await media.listMedia(importedId) : [];
      const importedBytes = await Promise.all(
        importedFiles.map(async (item: { id: string }) =>
          (await media.readMediaFile(item.id)).text(),
        ),
      );
      const persistedBeforeCatalogFailure = await persistedAtCatalog;
      inspectionDb.close();
      return {
        succeeded: importedId !== null,
        failure,
        attachmentWrites,
        persistedBeforeCatalogFailure,
        storageUnchanged: JSON.stringify(storage()) === JSON.stringify(beforeStorage),
        mediaUnchanged: JSON.stringify(await keys()) === JSON.stringify(beforeKeys),
        activeUnchanged: JSON.stringify(records.readRecord(active.id)) === JSON.stringify(active),
        lastUnchanged: localStorage.getItem("buzzzz.lastProject") === active.id,
        privateBytes: await (await media.readMediaFile(privateFile.id)).text(),
        importedProjectMatches: importedId
          ? JSON.stringify(records.readRecord(importedId)?.project) === JSON.stringify(project)
          : false,
        importedBytes: importedBytes.sort(),
        firstAttachments: importedId
          ? await media.listAttachments(importedId, project.presets[0].id)
          : [],
        secondAttachments: importedId ? await media.listAttachments(importedId, "second") : [],
      };
    }, stage);
    expect(result.activeUnchanged).toBe(true);
    expect(result.lastUnchanged).toBe(true);
    expect(result.privateBytes).toBe("private audio");
    expect(result.attachmentWrites).toBe(1);
    if (stage === "success") {
      expect(result.failure).toBeNull();
      expect(result.succeeded).toBe(true);
      expect(result.importedProjectMatches).toBe(true);
      expect(result.importedBytes).toEqual(['{"fr":30,"ip":0,"op":30}', "imported audio"].sort());
      expect(result.firstAttachments).toHaveLength(1);
      expect(result.firstAttachments[0].trim).toEqual({ startMs: 100, endMs: 600 });
      expect(result.secondAttachments).toHaveLength(1);
    } else {
      expect(result.succeeded).toBe(false);
      expect(result.failure).toBeTruthy();
      expect(result.storageUnchanged).toBe(true);
      expect(result.mediaUnchanged).toBe(true);
    }
    if (stage === "catalog-quota")
      expect(result.persistedBeforeCatalogFailure).toEqual({
        items: 2,
        blobs: 2,
        attachments: {
          audio: { startMs: 100, endMs: 600 },
          animation: null,
        },
      });
  });
