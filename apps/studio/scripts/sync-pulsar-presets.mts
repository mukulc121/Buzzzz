// Copies Pulsar's built-in preset patterns (MIT, from the pulsar repo's docs assets) into the studio library.
// Run with bun run sync-presets /absolute/path/to/pulsar.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isPattern, isRecord, type Pattern } from "@buzzzz/core";

const root = join(
  process.argv[2] ?? fileURLToPath(new URL("../../../../pulsar/", import.meta.url)),
  "docs/src/content/docs/assets",
);
const dirs = ["presets", "systemPresets/ios", "systemPresets/android"];
const out: { name: string; description: string; tags: string[]; pattern: Pattern }[] = [];
for (const dir of dirs) {
  for (const f of readdirSync(join(root, dir))
    .filter((f) => f.endsWith(".json"))
    .sort()) {
    const p: unknown = JSON.parse(readFileSync(join(root, dir, f), "utf8"));
    if (!isRecord(p)) throw new Error(`Invalid Pulsar pattern: ${dir}/${f}`);
    const { name, description, tags: rawTags } = p;
    if (!isPattern(p) || typeof name !== "string")
      throw new Error(`Invalid Pulsar pattern: ${dir}/${f}`);
    const tags = Array.isArray(rawTags)
      ? rawTags.filter((tag): tag is string => typeof tag === "string")
      : [];
    out.push({
      name,
      description: typeof description === "string" ? description : "",
      tags: dir === "presets" ? tags : [dir.endsWith("ios") ? "iOS" : "Android", ...tags],
      pattern: { discretePattern: p.discretePattern, continuousPattern: p.continuousPattern },
    });
  }
}
writeFileSync(
  new URL("../src/features/presets/data/pulsar-presets.json", import.meta.url),
  JSON.stringify(out),
);
console.log(`wrote ${out.length} presets to src/features/presets/data/pulsar-presets.json`);
