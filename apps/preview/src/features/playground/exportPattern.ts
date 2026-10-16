import { Share } from "react-native";
import { patternShareMessage, type IPlaygroundEvent } from "./recording";

export async function exportPattern(events: readonly IPlaygroundEvent[]) {
  const message = patternShareMessage(events);
  if (message) await Share.share({ message });
}
