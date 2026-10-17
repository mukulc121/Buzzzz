import { isRecord } from "@buzzzz/core";
import type { IMediaItem } from "./model";

export const MEDIA_DRAG_TYPE = "application/x-buzzzz-media";

export function writeMediaDrag(
  transfer: Pick<DataTransfer, "setData" | "effectAllowed">,
  item: IMediaItem,
) {
  transfer.setData(
    MEDIA_DRAG_TYPE,
    JSON.stringify({ projectId: item.projectId, assetId: item.id }),
  );
  transfer.effectAllowed = "copy";
}

export function readMediaDrag(
  transfer: Pick<DataTransfer, "getData">,
  projectId: string,
): string | null {
  try {
    const value: unknown = JSON.parse(transfer.getData(MEDIA_DRAG_TYPE));
    return isRecord(value) &&
      value.projectId === projectId &&
      typeof value.assetId === "string" &&
      /^media_[\w-]{1,100}$/.test(value.assetId)
      ? value.assetId
      : null;
  } catch {
    return null;
  }
}
