import { useEffect } from "react";
import { deleteSelection } from "../features/composer/editing";
import type { Studio } from "./useStudio";

export function useShortcuts(studio: Studio) {
  useEffect(() => {
    const { document, composer, playback } = studio;
    const handle = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const command = event.metaKey || event.ctrlKey;
      if (command && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        document.saveNow();
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input,select,textarea,[contenteditable]")
      )
        return;
      if (command && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) document.redo();
        else document.undo();
        composer.setSelected(null);
      } else if (
        (event.key === "Delete" || event.key === "Backspace") &&
        composer.selection.length
      ) {
        event.preventDefault();
        studio.applyPattern(
          deleteSelection({ pattern: document.pattern, selection: composer.selection }),
        );
        composer.setSelected(null);
      } else if (
        (event.key.toLowerCase() === "p" || event.key === "MediaPlayPause") &&
        !command &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault();
        studio.togglePlayback();
      } else if (event.key === "1") composer.setLayer("amplitude");
      else if (event.key === "2") composer.setLayer("frequency");
      else if (event.key === "3") composer.setLayer("discrete");
      else if (event.key === "+" || event.key === "=") composer.zoom(1 / 1.5);
      else if (event.key === "-") composer.zoom(1.5);
      else if (event.key === "Escape") {
        if (!studio.snippetCapture.cancel()) composer.setSelected(null);
      } else if (event.key.toLowerCase() === "m") composer.addMarker(playback.playhead ?? 0);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [studio]);
}
