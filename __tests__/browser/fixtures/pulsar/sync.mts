// Rebuilds this oracle from a software-mansion/pulsar checkout: bun __tests__/browser/fixtures/pulsar/sync.mts /path/to/pulsar
import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Pattern } from "@buzzzz/core";
import { patternDigest } from "./digest.ts";

const repo = process.argv[2];
if (!repo) throw new Error("Pass a Pulsar checkout path.");
const docs = join(repo, "docs/src/content/docs");
const commit = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const presets = ["presets", "systemPresets/ios", "systemPresets/android"].flatMap((dir) =>
  readdirSync(join(docs, "assets", dir))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const preset = JSON.parse(
        readFileSync(join(docs, "assets", dir, file), "utf8"),
      ) as Pattern & {
        name: string;
      };
      return { file: `${dir}/${file}`, name: preset.name, digest: patternDigest(preset) };
    }),
);
const here = new URL(".", import.meta.url).pathname;
copyFileSync(join(docs, "components/Preset/audio-player.ts"), join(here, "audio-player.ts.txt"));
copyFileSync(join(repo, "LICENSE"), join(here, "LICENSE"));
writeFileSync(
  join(here, "presets.json"),
  `${JSON.stringify({ repository: "software-mansion/pulsar", commit, presets }, null, 2)}\n`,
);
console.log(`wrote ${presets.length} presets from ${commit}`);
