import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { MAX_PATTERN_MS, patternEnd, resolveRivePresetId, type Pattern } from "@buzzzz/core";
import { useProject } from "../features/project/useProject";
import { useComposer } from "../features/composer/useComposer";
import { quantizeValue } from "../features/composer/editorSettings";
import { usePlayback } from "../features/composer/usePlayback";
import { playSound } from "../features/composer/audio";
import { useRiveSession } from "../features/rive/useRiveSession";
import { useRiveSound } from "../features/rive/useRiveSound";
import { useAudioTrack } from "../features/audio/useAudioTrack";
import { useAnimationTrack } from "../features/animation/useAnimationTrack";
import { useSharedProject } from "../features/connection/useSharedProject";
import { useActivityLog } from "../features/activity/useActivityLog";
import { useTheme } from "./useTheme";
import { useShortcuts } from "./useShortcuts";
import { useAttachedTracks } from "../features/media/useAttachedTracks";
import { useMediaPreview } from "../features/media/useMediaPreview";
import { useSharing } from "../features/connection/useSharing";
import type { TPhonePreset } from "../features/connection/phoneLibrary";
import { usePhonePlayback } from "../features/connection/usePhonePlayback";
import { documentPhoneMedia } from "../features/connection/documentPhoneMedia";
import { useCanonicalProject } from "../features/mcp/useCanonicalProject";
import { useMcpBridge } from "../features/mcp/useMcpBridge";
import { useStudioFiles } from "./useStudioFiles";
import { useToolWorkspace } from "../features/tools/useToolWorkspace";
import type { Panel } from "./ToolRail";

export function useStudio() {
  const tools = useToolWorkspace();
  const document = useProject();
  const instanceKey = `${document.projectId}\u0000${document.preset.id}`;
  const composer = useComposer(
    document.pattern,
    document.preset.editor,
    document.setEditor,
    instanceKey,
  );
  const appearance = useTheme();
  const activity = useActivityLog();
  const [error, setError] = useState<string | null>(null);
  useSharedProject({
    ready: document.isWriter,
    projectId: document.projectId,
    onLoad: document.openProject,
    onError: setError,
  });
  const [panel, setPanel] = useState<Panel | null>("patterns");
  const [inspector, setInspector] = useState<"inspector" | "sound" | "animation">("inspector");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const originals = useRef(new Map<string, Pattern>());
  const audio = useAudioTrack({ onError: setError });
  const animation = useAnimationTrack({ onError: setError });
  const riveSound = useRiveSound();
  const { setEnabled: setRiveSoundEnabled } = riveSound;
  const session = useRiveSession({
    project: document.project,
    projectId: document.projectId,
    active:
      !document.route.dashboard && resolveRivePresetId(document.project) === document.preset.id,
    mapped: document.mapped,
    addLog: activity.addLog,
    onError: setError,
    onStateMachineChange: (name) => {
      document.begin();
      document.setProject((project) => ({ ...project, riveStateMachine: name }));
    },
    onTrigger: (pattern) => {
      if (playback.sound && !audio.source) playSound(pattern);
    },
    onSystemImpact: riveSound.impact,
    onSystemStop: riveSound.stop,
    systemPreviewEnabled: riveSound.isEnabled,
  });
  const media = useAttachedTracks({
    writable: document.isWriter,
    projectId: document.projectId,
    presetId: document.preset.id,
    onError: setError,
    audio,
    animation,
    rive: session,
    rivePresetId: resolveRivePresetId(document.project),
    onRiveAttach: (preserveConfig) => {
      document.begin();
      return document.commitProject((project) => ({
        ...project,
        rivePresetId: document.preset.id,
        ...(preserveConfig ? {} : { riveConfig: undefined, riveStateMachine: undefined, map: {} }),
      }));
    },
    onRiveDetach: () => {
      document.begin();
      document.setProject((project) => ({
        ...project,
        rivePresetId: null,
        riveConfig: undefined,
        riveStateMachine: undefined,
        map: {},
      }));
    },
  });
  const mediaPreview = useMediaPreview(
    media.library,
    setError,
    document.route.dashboard ? null : document.projectId,
  );
  const preparePhone = usePhonePlayback({
    projectId: document.projectId,
    preset: { resourceId: document.preset.id, name: document.preset.name },
    writable: document.isWriter,
    room: session.room,
    connected: session.connected,
    joinVersion: session.joinVersion,
    media: documentPhoneMedia({
      preset: document.preset,
      ready: media.ready,
      pending: media.pending,
      audio,
      animation,
    }),
  });
  const playback = usePlayback({
    preset: { resourceId: document.preset.id, name: document.preset.name },
    preparePhone,
    phoneKey: instanceKey,
    hasAnimation: Boolean(animation.source),
    onOpenDevice: () => setPanel("device"),
    cursor: composer.cursor,
    onCursorChange: composer.setCursor,
    onError: setError,
    onStart: (time) => {
      animation.setSeekMs(time);
      animation.setPlaying(true);
    },
    onStop: () => animation.setPlaying(false),
    onSeek: animation.setSeekMs,
    send: session.send,
    phones: session.phones,
    durationMs: Math.max(
      animation.source?.durationMs ?? 0,
      document.preset.editor?.durationMs ?? 0,
    ),
    track: audio.source
      ? { url: audio.source.url, startMs: audio.trim.startMs, endMs: audio.trim.endMs }
      : null,
  });
  useLayoutEffect(() => {
    setRiveSoundEnabled(playback.sound && !audio.source);
  }, [playback.sound, audio.source, setRiveSoundEnabled]);
  const applyPattern = (pattern: Pattern) => {
    if (!document.isWriter) return;
    document.begin();
    document.setPattern(pattern);
    composer.setSelected(null);
  };
  const applyGenerated = (pattern: Pattern) => {
    if (!document.isWriter) return;
    const key = `${document.projectId}/${document.preset.id}`;
    if (!originals.current.has(key)) originals.current.set(key, structuredClone(document.pattern));
    applyPattern(pattern);
    composer.fit(patternEnd(pattern));
  };
  const restore = () => {
    if (!document.isWriter) return;
    const key = `${document.projectId}/${document.preset.id}`;
    const pattern = originals.current.get(key);
    if (pattern) {
      applyPattern(pattern);
      originals.current.delete(key);
    }
  };
  const preserve = (pattern: Pattern, name: string) =>
    document.addPreset(pattern, name, { select: false });
  const selectPreset = (id: string) => {
    playback.stop();
    document.selectPreset(id);
    composer.setSelected(null);
  };
  const addPreset = (pattern?: Pattern, name?: string) => {
    const creating = pattern === undefined && name === undefined;
    document.addPreset(pattern, name, { rename: creating, durationMs: creating ? 100 : undefined });
    composer.setSelected(null);
  };
  const duplicatePreset = async (id: string) => {
    const copied = await document.duplicatePreset(id);
    if (!copied) return;
    const preset = document.getProject().presets.find((item) => item.id === copied);
    if (!preset) return;
    selectPreset(copied);
  };
  const sharing = useSharing({
    room: session.room,
    projectId: document.projectId,
    project: document.project,
    onError: setError,
  });
  const files = useStudioFiles({
    document,
    composer,
    session,
    media,
    onError: setError,
    onInspector: (tab) => {
      setInspector(tab);
      setInspectorOpen(true);
    },
    onLog: activity.addLog,
  });
  const canonical = useCanonicalProject({
    room: session.room,
    subscribe: session.subscribe,
    document,
    onError: setError,
  });
  const mcp = useMcpBridge({
    room: session.room,
    connected: session.connected,
    subscribe: session.subscribe,
    send: session.send,
    document,
    composer,
    playback,
    audio,
    animation,
    media,
    applyGenerated,
    preserve,
  });
  const previewPlayback = usePlayback({
    onError: setError,
    send: session.send,
    phones: session.phones,
  });
  const audition = (pattern: Pattern, preset?: TPhonePreset) => {
    if (playback.playing) playback.stop();
    previewPlayback.play(pattern, undefined, "pattern", preset);
  };
  const toolbarPlaying =
    Boolean(session.riv && session.ready && !session.paused) ||
    playback.playing ||
    previewPlayback.playing ||
    animation.playing ||
    (mediaPreview.playingId !== null &&
      mediaPreview.playingId === media.library.attachment.audio?.assetId);
  const togglePlayback = () => {
    if (toolbarPlaying) {
      if (session.riv) {
        session.setPause(true);
        session.send({ type: "pause", paused: true });
      }
      if (playback.playing) playback.stop();
      if (previewPlayback.playing) previewPlayback.stop();
      if (animation.playing) {
        animation.setPlaying(false);
        animation.setSeekMs(0);
      }
      if (mediaPreview.playingId === media.library.attachment.audio?.assetId) mediaPreview.stop();
    } else if (session.riv) {
      session.restart();
      session.send({ type: "restart" });
    } else playback.play(document.pattern, composer.range ?? undefined);
  };
  const resetPlayback = useEffectEvent(() => {
    playback.stop();
    composer.setSelected(null);
  });
  useEffect(() => {
    resetPlayback();
  }, [document.projectId, document.preset.id]);
  const attachedViews = useRef(new Map<string, string>());
  const fitMedia = useEffectEvent(() => {
    if (!media.ready || media.pending.audio || media.pending.animation) return;
    const signature = JSON.stringify([
      media.library.attachment.audio?.assetId,
      media.library.attachment.animation?.assetId,
    ]);
    if (attachedViews.current.get(instanceKey) === signature) return;
    attachedViews.current.set(instanceKey, signature);
    composer.fit(
      Math.max(
        patternEnd(document.pattern),
        document.preset.editor?.durationMs ?? 0,
        audio.source ? audio.trim.endMs - audio.trim.startMs : 0,
        animation.source?.durationMs ?? 0,
      ),
    );
  });
  useEffect(() => {
    fitMedia();
  }, [
    instanceKey,
    media.ready,
    media.pending.audio,
    media.pending.animation,
    media.library.attachment.audio?.assetId,
    media.library.attachment.animation?.assetId,
    audio.source?.url,
    animation.source?.url,
    animation.source?.animationId,
  ]);
  const editSelection = (field: string, value: number) => {
    if (!composer.selected || !Number.isFinite(value)) return;
    const next = structuredClone(document.pattern);
    const point =
      composer.selected.layer === "discrete"
        ? next.discretePattern[composer.selected.index]
        : next.continuousPattern[composer.selected.layer][composer.selected.index];
    if (!point) return;
    if (field === "time") point.time = Math.min(MAX_PATTERN_MS, Math.max(0, value));
    else if (field === "value" && "value" in point)
      point.value = quantizeValue(value / 100, composer.settings.values.valueDecimals);
    else if (field === "amplitude" && "amplitude" in point)
      point.amplitude = quantizeValue(value / 100, composer.settings.values.valueDecimals);
    else if (field === "frequency" && "frequency" in point)
      point.frequency = quantizeValue(value / 100, composer.settings.values.valueDecimals);
    document.setPattern(next);
  };
  const studio = {
    tools,
    document,
    composer,
    appearance,
    activity,
    error,
    setError,
    panel,
    setPanel,
    inspector,
    setInspector,
    inspectorOpen,
    setInspectorOpen,
    audio,
    animation,
    session,
    playback,
    applyPattern,
    applyGenerated,
    restore,
    preserve,
    selectPreset,
    addPreset,
    duplicatePreset,
    ...files,
    media,
    mediaPreview,
    sharing,
    canonical,
    mcp,
    audition,
    previewPlayback,
    toolbarPlaying,
    togglePlayback,
    editSelection,
  };
  useShortcuts(studio);
  return studio;
}
export type Studio = ReturnType<typeof useStudio>;
