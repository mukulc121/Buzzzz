import type { EditorCommand } from "@buzzzz/core";
import { animationAnalyze, animationGenerate } from "./animationCommands";
import { audioAnalyze, audioGenerate } from "./audioCommands";
import { parseCommand } from "./commands";
import { editorCursor, editorHistory, editorRange, editorSelection } from "./editorCommands";
import { mediaAttach, mediaDetach, mediaTrim } from "./mediaCommands";
import type { ICommandContext } from "./target";

export async function dispatchCommand(
  command: EditorCommand,
  args: Record<string, unknown>,
  context: ICommandContext,
): Promise<unknown> {
  const request = parseCommand(command, args);
  switch (request.command) {
    case "audio_analyze":
      return audioAnalyze(request, context);
    case "audio_generate":
      return audioGenerate(request, context);
    case "animation_analyze":
      return animationAnalyze(request, context);
    case "animation_generate":
      return animationGenerate(request, context);
    case "editor_selection":
      return editorSelection(request, context.read());
    case "editor_cursor":
      return editorCursor(request, context.read());
    case "editor_range":
      return editorRange(request, context.read());
    case "editor_history":
      return editorHistory(request, context.read());
    case "media_attach":
      return mediaAttach(request, context);
    case "media_detach":
      return mediaDetach(request, context.read());
    case "media_trim":
      return mediaTrim(request, context.read());
    default: {
      const exhaustive: never = request;
      return exhaustive;
    }
  }
}
