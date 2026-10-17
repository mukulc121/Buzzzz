import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { unzipSync } from "fflate";

test("Audio Sync ships the published Pulsar bundle and original Fanfare recording", async () => {
  const bytes = new Uint8Array(
    await Bun.file(
      new URL("../assets/bundles/PulsarAppBundle.pulsar", import.meta.url),
    ).arrayBuffer(),
  );
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    "de8acbb28462229e45e8400c9a5131f0cc00b680977efb4693ba5cd83f2124d0",
  );
  const files = unzipSync(bytes);
  expect(createHash("sha256").update(files["audio/fanfaresound.mp3"]).digest("hex")).toBe(
    "572f2ec44b43acca3f3a1a54a63e99b2d3dcddc33f8c36e3c9aa76994741efda",
  );
});
