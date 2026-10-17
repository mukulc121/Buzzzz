import type { Project } from "@buzzzz/core";
import type { IImportedMedia, IRiveAsset } from "../imports/model";
import { importProjectMedia, removeProjectMedia } from "./mediaTransfer";
import { newRecord } from "./model";
import { writeRecord } from "./repository";

export async function importProject(input: {
  name: string;
  project: Project;
  media: readonly IImportedMedia[];
  riv: IRiveAsset | null;
}) {
  const record = newRecord(input.name, input.project);
  try {
    await importProjectMedia(record.id, input.media, input.riv);
    const error = writeRecord(record);
    if (error) throw new Error(error);
    return record.id;
  } catch (error) {
    try {
      await removeProjectMedia(record.id);
    } catch {
      throw new Error(
        "Import failed and its temporary media could not be removed. The open project is unchanged.",
        { cause: error },
      );
    }
    throw error;
  }
}
