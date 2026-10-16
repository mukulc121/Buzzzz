import type { EditorRequest } from "./commands";
import { CommandError, requireWriter, throwIfAborted } from "./guards";
import { safeFilename } from "./asset";
import type { ICommandContext, IEditorTarget } from "./target";

type TRequest<T extends EditorRequest["command"]> = Extract<EditorRequest, { command: T }>;

// context.loadAsset rejects anything but a signed asset of this room.
export async function mediaAttach(request: TRequest<"media_attach">, context: ICommandContext) {
  requireWriter(context.read());
  const blob = await context.loadAsset({
    url: request.assetUrl,
    kind: request.kind,
    signal: context.signal,
  });
  throwIfAborted(context.signal);
  const target = context.read();
  requireWriter(target);
  const file = new File([blob], safeFilename(request.filename), { type: blob.type });
  if (!(await target.media.importFile(file, request.kind)))
    throw new CommandError(`The editor could not load or store ${file.name} as ${request.kind}`);
  return { attached: true, kind: request.kind, filename: file.name, bytes: file.size };
}

export async function mediaDetach(request: TRequest<"media_detach">, target: IEditorTarget) {
  requireWriter(target);
  if (!target.media.ready) throw new CommandError("Media is still loading. Retry when it is ready");
  if (!target.media.library.attachment[request.kind])
    throw new CommandError(`No ${request.kind} is attached to this pattern`);
  if ((await target.media.detach(request.kind)) === null)
    throw new CommandError(`The editor could not detach ${request.kind}`);
  return { detached: true, kind: request.kind };
}

// Mirrors useAudioTrack.setTrim clamping so the reply states the applied window.
export function mediaTrim(request: TRequest<"media_trim">, target: IEditorTarget) {
  requireWriter(target);
  const { audio, media } = target;
  if (media.pending.audio || audio.decoding)
    throw new CommandError("Audio is still loading. Retry when it is ready");
  if (!audio.source) throw new CommandError("No audio is attached. Call media_attach first");
  const total = audio.source.durationMs;
  const startMs = Math.min(Math.max(0, total - 1), request.offsetMs);
  const endMs = Math.min(
    total,
    startMs + 60000,
    Math.max(startMs + 1, startMs + request.durationMs),
  );
  audio.setTrim(startMs, endMs);
  return { offsetMs: startMs, durationMs: endMs - startMs, sourceDurationMs: total };
}
