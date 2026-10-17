import data from "./data/pulsar-studio-presets.json";
import groups from "./data/pulsar-studio-tags.json";

export type StudioPreset = (typeof data)[number];
export const studioPresets = data;
export const studioTagGroups = groups;
export const studioTagCounts = Object.fromEntries(
  groups.flatMap((group) =>
    group.tags.map((tag) => [
      tag.name,
      data.filter((entry) => entry.tags.includes(tag.name)).length,
    ]),
  ),
);

export function filterStudioPresets(options: { query: string; tags: readonly string[] }) {
  const { query, tags } = options;
  const needle = query.trim().toLowerCase();
  return data.filter(
    (entry) =>
      tags.every((tag) => entry.tags.includes(tag)) &&
      (!needle ||
        [entry.name, entry.description, ...entry.tags].some((value) =>
          value.toLowerCase().includes(needle),
        )),
  );
}
