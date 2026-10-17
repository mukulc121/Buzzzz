import { expect, test } from "bun:test";
import {
  filterPresets,
  INITIAL_FILTERS,
  searchPresets,
  selectPresets,
} from "../src/features/presets/filterPresets";
import published from "./fixtures/published-presets.json";

const standard = [
  { name: "Soft click", description: "Subtle confirmation", tags: ["Gentle", "Soft", "Impulse"] },
  { name: "Sharp click", description: "Precise confirmation", tags: ["Bold", "Rigid", "Impulse"] },
  { name: "Soft wave", description: "Longer feedback", tags: ["Bold", "Soft", "Long"] },
];
const catalogs = {
  standard,
  ios: [{ name: "Light", description: "System light impact", tags: ["Gentle", "Soft"] }],
  android: [
    { name: "Click", description: "System click", tags: ["Effect", "Rigid"] },
    { name: "Tick", description: "System tick", tags: ["Primitive", "Soft"] },
    { name: "Vendor", description: "Vendor effect", tags: ["Vendor", "Rigid"] },
    { name: "Fallback", description: "iOS fallback", tags: ["iOS Fallback", "Soft"] },
  ],
};

test("preset filters start with the published sound, catalog and layout defaults", () => {
  expect(INITIAL_FILTERS).toEqual(published.initialFilters);
  expect(selectPresets(catalogs, "ios", INITIAL_FILTERS, [])).toEqual(standard);
  expect(selectPresets(catalogs, "android", INITIAL_FILTERS, [])).toEqual(standard);
});

test("tags combine alternatives within a group and require matches across groups", () => {
  expect(filterPresets(standard, ["Gentle", "Bold", "Soft"])).toEqual([standard[0], standard[2]]);
  expect(filterPresets(standard, ["Gentle", "Rigid"])).toEqual([]);
  expect(filterPresets(standard, ["Soft", "Long"])).toEqual([standard[2]]);
  expect(filterPresets(standard, [])).toEqual(standard);
  expect(filterPresets(standard, ["Unknown"])).toEqual(standard);
});

test("system presets replace the standard catalog and use Android-only category switches", () => {
  const filters = { ...INITIAL_FILTERS, showSystemPresets: true };
  expect(selectPresets(catalogs, "ios", filters, [])).toEqual(catalogs.ios);
  expect(selectPresets(catalogs, "android", filters, [])).toEqual(catalogs.android.slice(0, 2));
  expect(
    selectPresets(catalogs, "android", { ...filters, selectedSystemPresetTags: [] }, []),
  ).toEqual([]);
  expect(selectPresets(catalogs, "ios", { ...filters, selectedSystemPresetTags: [] }, [])).toEqual(
    catalogs.ios,
  );
  expect(
    selectPresets(
      catalogs,
      "android",
      { ...filters, selectedSystemPresetTags: ["Vendor", "iOS Fallback"], selectedTags: ["Soft"] },
      [],
    ),
  ).toEqual([catalogs.android[3]]);
});

test("favourites apply after the catalog and tag filters without reordering presets", () => {
  const filters = { ...INITIAL_FILTERS, showFavouritesOnly: true, selectedTags: ["Soft"] };
  expect(
    selectPresets(catalogs, "ios", filters, ["Soft wave", "Sharp click", "Soft click"]),
  ).toEqual([standard[0], standard[2]]);
  expect(selectPresets(catalogs, "ios", filters, [])).toEqual([]);
});

test("search matches names, descriptions and tags without changing source whitespace semantics", () => {
  expect(searchPresets(standard, "CLICK")).toEqual(standard.slice(0, 2));
  expect(searchPresets(standard, "confirmation")).toEqual(standard.slice(0, 2));
  expect(searchPresets(standard, "rigid")).toEqual([standard[1]]);
  expect(searchPresets(standard, " click")).toEqual(standard.slice(0, 2));
  expect(searchPresets(standard, "click ")).toEqual([]);
});
