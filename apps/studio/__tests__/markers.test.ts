import { expect, test } from "bun:test";
import { nextMarkerLabel } from "../src/features/composer/markers";

test("marker numbering follows existing numbered labels after removals and custom names", () => {
  const markers = (labels: string[]) =>
    labels.map((label, index) => ({ id: String(index), time: index, label }));
  expect(nextMarkerLabel([])).toBe("Marker 1");
  expect(nextMarkerLabel(markers(["Marker 1", "Marker 3"]))).toBe("Marker 4");
  expect(nextMarkerLabel(markers(["Impact", "Marker 9 tail", "Marker 2"]))).toBe("Marker 3");
});
