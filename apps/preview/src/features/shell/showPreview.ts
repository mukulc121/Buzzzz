import type { ImperativeRouter } from "expo-router";

// From a root modal, pop back to the existing (tabs); replace or navigate would stack a second one.
export function showPreview(
  router: Pick<ImperativeRouter, "navigate" | "dismissTo">,
  segments: readonly string[],
) {
  if (segments[0] === "(tabs)") router.navigate("/preview");
  else router.dismissTo("/preview");
}
