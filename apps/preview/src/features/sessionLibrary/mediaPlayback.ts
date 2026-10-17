import type { Pattern } from "react-native-pulsar";
import type { IResolvedResource } from "./mediaModel";

export function resourcePlaybackPattern(resource: IResolvedResource): Pattern {
  const { record, localUri, clipMissing } = resource;
  if (record.kind !== "audio" || !localUri || clipMissing) return record.pattern;
  return {
    ...record.pattern,
    sound: {
      uri: localUri,
      volume: record.volume ?? 1,
      offset: record.offset ?? 0,
      start: record.soundStartMs ?? 0,
      duration: record.soundDurationMs ?? 0,
    },
  };
}
