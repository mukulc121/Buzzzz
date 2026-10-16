import { File, Paths } from "expo-file-system";
import { isAvailableAsync, shareAsync } from "expo-sharing";
import { toDevice, type Pattern } from "@buzzzz/core";

export async function exportPattern(pattern: Pattern) {
  if (!(await isAvailableAsync())) throw new Error("File sharing is unavailable on this device.");
  const file = new File(Paths.cache, "buzzzz-recording.json");
  file.create({ overwrite: true });
  file.write(JSON.stringify(toDevice(pattern), null, 2));
  await shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: "Export haptic recording",
    UTI: "public.json",
  });
}
