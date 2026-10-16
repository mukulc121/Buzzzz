import { expect, test } from "bun:test";
import { Worker } from "node:worker_threads";

for (const scenario of [
  "concurrent",
  "active-concurrent",
  "switch",
  "takeover",
  "rollback",
  "read-only",
  "decode",
  "locked-target",
  "save-failure",
]) {
  test(`project media ownership: ${scenario}`, async () => {
    const url = new URL("./fixtures/project-media-runtime.mjs", import.meta.url);
    const worker = new Worker(url, { workerData: scenario });
    try {
      const result = await new Promise<string>((resolve, reject) => {
        worker.once("message", resolve);
        worker.once("error", reject);
      });
      expect(result).toBe(`PASS ${scenario}`);
    } finally {
      await worker.terminate();
    }
  });
}
