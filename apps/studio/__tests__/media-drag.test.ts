import { expect, test } from "bun:test";
import { MEDIA_DRAG_TYPE, readMediaDrag, writeMediaDrag } from "../src/features/media/mediaDrag";
import type { IMediaItem } from "../src/features/media/model";

test("media drags carry a stored asset identity and only resolve inside its project", () => {
  const data = new Map<string, string>();
  const transfer: Pick<DataTransfer, "getData" | "setData" | "effectAllowed"> = {
    effectAllowed: "none",
    getData: (type) => data.get(type) ?? "",
    setData: (type, value) => {
      data.set(type, value);
    },
  };
  const item: IMediaItem = {
    id: "media_abc-123",
    projectId: "project-a",
    kind: "audio",
    name: "a.wav",
    originalName: "a.wav",
    type: "audio/wav",
    size: 1,
    lastModified: 0,
    addedAt: 0,
    sha256: "hash",
  };
  writeMediaDrag(transfer, item);
  expect(transfer.effectAllowed).toBe("copy");
  expect(readMediaDrag(transfer, item.projectId)).toBe(item.id);
  expect(readMediaDrag(transfer, "another-project")).toBeNull();
  for (const invalid of [
    "not json",
    "null",
    "{}",
    JSON.stringify({ projectId: item.projectId, assetId: "../../file" }),
  ]) {
    data.set(MEDIA_DRAG_TYPE, invalid);
    expect(readMediaDrag(transfer, item.projectId)).toBeNull();
  }
});
