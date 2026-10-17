const TYPE = "application/x-buzzzz-pattern";

export interface IPatternDrag {
  sourceProjectId: string;
  presetId: string;
}

export function writePatternDrag(data: DataTransfer, value: IPatternDrag) {
  data.setData(TYPE, JSON.stringify(value));
  data.effectAllowed = "copy";
}

export const hasPatternDrag = (data: DataTransfer) => data.types.includes(TYPE);

export function readPatternDrag(data: DataTransfer): IPatternDrag | null {
  try {
    const value: unknown = JSON.parse(data.getData(TYPE) || "null");
    if (typeof value !== "object" || value === null) return null;
    const { sourceProjectId, presetId } = value as Partial<IPatternDrag>;
    return typeof sourceProjectId === "string" && typeof presetId === "string"
      ? { sourceProjectId, presetId }
      : null;
  } catch {
    return null;
  }
}
