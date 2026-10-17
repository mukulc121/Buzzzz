import { Chart } from "../features/composer/Chart";
import { TimelinePanel } from "../features/composer/TimelinePanel";
import { RivePanel } from "../features/rive/RivePanel";
import { AnimationPreview } from "../features/animation/AnimationPreview";
import { EditorPlayButton } from "../components/EditorPlayButton";
import { derivePlaybackLabel } from "../features/composer/playbackLabel";
import type { Studio } from "./useStudio";
import { useAnalysisCurves } from "./useAnalysisCurves";
import { ProjectStatus } from "../features/project/ProjectStatus";
import { PRESET_DRAG_TYPE, readPresetDrag } from "../features/presets/drag";
import { chartGeometry } from "../features/composer/geometry";
import { toolBindings } from "./toolBindings";
import { patternEnd } from "@buzzzz/core";
import { PatternTitle } from "../components/PatternTitle";
import { MEDIA_DRAG_TYPE, readMediaDrag } from "../features/media/mediaDrag";
import { useRef } from "react";
import { SnippetRange } from "../features/composer/SnippetRange";

interface IEditorCanvas {
  studio: Studio;
}
export function EditorCanvas(props: IEditorCanvas) {
  const { studio } = props;
  const { document, composer, playback, session, audio } = studio;
  const fileInput = useRef<HTMLInputElement>(null);
  const hasPattern =
    document.pattern.discretePattern.length +
      document.pattern.continuousPattern.amplitude.length +
      document.pattern.continuousPattern.frequency.length >
    0;
  const riveCues = session.riv && !hasPattern ? studio.riveTimeline : null;
  const curves = useAnalysisCurves(audio);
  const markerDurationMs = Math.max(
    riveCues?.durationMs ?? 0,
    patternEnd(document.pattern),
    audio.analysis?.durationMs ?? 0,
    studio.animation.source?.durationMs ?? 0,
    document.preset.editor?.durationMs ?? 0,
  );
  const playButton = derivePlaybackLabel({
    name: document.preset.name,
    pattern: document.pattern,
    playing: studio.toolbarPlaying,
    durationMs: Math.max(
      patternEnd(document.pattern),
      audio.source ? audio.trim.endMs - audio.trim.startMs : 0,
      studio.animation.source?.durationMs ?? 0,
      document.preset.editor?.durationMs ?? 0,
    ),
    range: composer.range,
    cursor: composer.cursor ?? 0,
    phones: session.phones,
    onPhone: playback.onPhone,
    sound: playback.sound,
    audio: Boolean(audio.source) && playback.trackEnabled,
    animation: Boolean(studio.animation.source),
  });
  return (
    <main className="editor-canvas">
      <header className="pattern-header">
        <PatternTitle
          key={document.preset.id}
          name={document.preset.name}
          renaming={document.renamingId === document.preset.id}
          writable={document.isWriter}
          onStartRename={() => document.startRenaming(document.preset.id)}
          onCommit={(name) => {
            document.begin();
            document.renamePreset(document.preset.id, name);
          }}
          onCancel={document.cancelRenaming}
        />
        <ProjectStatus
          status={document.status}
          storageError={document.storageError}
          onTakeOver={document.takeOver}
          onResolve={document.resolveConflict}
        />
        <EditorPlayButton
          playing={studio.toolbarPlaying}
          {...(session.riv && !studio.toolbarPlaying
            ? {
                ...playButton,
                label: `Play “${document.preset.name}” - Rive animation and haptics · P`,
              }
            : playButton)}
          onClick={studio.togglePlayback}
        />
      </header>
      <div
        className={`canvas-scroll ${(session.riv || studio.animation.source) && studio.animation.previewVisible ? `preview-${studio.animation.previewMode}` : ""}`}
      >
        <section
          className="chart-card"
          aria-label="Pattern editor"
          onDragOver={(event) => {
            if (
              !event.dataTransfer.types.includes(PRESET_DRAG_TYPE) &&
              !event.dataTransfer.types.includes(MEDIA_DRAG_TYPE)
            )
              return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(event) => {
            const assetId = readMediaDrag(event.dataTransfer, document.projectId);
            if (assetId) {
              event.preventDefault();
              event.stopPropagation();
              if (document.isWriter) void studio.attachMediaAsset(assetId);
              return;
            }
            const pattern = readPresetDrag(event.dataTransfer);
            if (!pattern) return;
            event.preventDefault();
            event.stopPropagation();
            const bounds = event.currentTarget.querySelector(".chart")?.getBoundingClientRect();
            if (!bounds) return;
            const geometry = chartGeometry({
              width: bounds.width,
              height: bounds.height,
              ...composer.viewport,
            });
            const time = geometry.timeAtX(event.clientX - bounds.left);
            toolBindings(studio).onAppend(pattern, Math.round(Math.max(0, time)));
          }}
        >
          <input
            ref={fileInput}
            type="file"
            accept=".ahap,.haptic,.hapt,.vib,.json,.pulsar,.riv,application/json"
            multiple
            hidden
            onChange={async (event) => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
              if (!document.isWriter) return;
              for (const file of files) await studio.importFile(file);
            }}
          />
          <Chart
            key={`${document.projectId}\u0000${document.preset.id}`}
            pattern={riveCues?.pattern ?? document.pattern}
            patternSegments={riveCues?.segments}
            readOnly={Boolean(riveCues) || !document.isWriter}
            actions={{
              canUndo: document.canUndo,
              canRedo: document.canRedo,
              onUndo: () => {
                document.undo();
                composer.setSelected(null);
              },
              onRedo: () => {
                document.redo();
                composer.setSelected(null);
              },
              onLayerChange: composer.setLayer,
              onAddMarker: (timeMs) => {
                if (document.isWriter) composer.addMarker(timeMs);
              },
              onOpenFile: () => {
                if (document.isWriter) fileInput.current?.click();
              },
              onSaveRange: studio.snippetCapture.open,
              onCancelOverlay: studio.snippetCapture.cancel,
              clipboard: composer.clipboard,
              onCopy: composer.setClipboard,
            }}
            overlay={(geometry) =>
              studio.snippetCapture.range && (
                <SnippetRange
                  geometry={geometry}
                  range={studio.snippetCapture.range}
                  durationMs={Math.max(100, markerDurationMs)}
                  onChange={studio.snippetCapture.change}
                  onSave={studio.snippetCapture.save}
                  onCancel={studio.snippetCapture.cancel}
                />
              )
            }
            getPlayhead={riveCues ? session.elapsedMs : undefined}
            layer={composer.layer}
            viewMs={composer.viewport.durationMs}
            viewStartMs={composer.viewport.startMs}
            selected={composer.selected}
            selection={composer.selection}
            onSelect={composer.setPrimarySelection}
            onSelectionChange={composer.setSelection}
            playhead={playback.playhead}
            onScrub={riveCues ? undefined : playback.setPlayhead}
            onBegin={document.begin}
            onChange={document.setPattern}
            visibleLayers={composer.visibleLayers}
            snapMs={composer.snapMs}
            multilayerSelection={composer.multilayerSelection}
            editorSettings={composer.settings.values}
            playbackRange={riveCues ? undefined : (composer.range ?? undefined)}
            markers={composer.markers}
            markerDurationMs={markerDurationMs}
            onMarkerMove={composer.moveMarker}
            onMarkerRename={composer.renameMarker}
            onViewChange={composer.setViewport}
            onError={studio.setError}
            analysisCurves={curves}
          />
        </section>
        {!session.riv && studio.animation.previewVisible && (
          <AnimationPreview
            animation={studio.animation}
            seekMs={playback.playhead ?? studio.animation.seekMs}
          />
        )}
        {session.riv && (
          <RivePanel
            riv={session.riv}
            canvas={session.canvas}
            animation={studio.animation}
            restart={session.restart}
            send={session.send}
            addLog={studio.activity.addLog}
            paused={session.paused}
            completed={session.completed}
            setPause={session.setPause}
          />
        )}
      </div>
      <TimelinePanel
        instanceKey={`${document.projectId}\u0000${document.preset.id}`}
        pattern={document.pattern}
        viewport={composer.viewport}
        onViewChange={composer.setViewport}
        range={composer.range}
        onRangeChange={composer.setRange}
        playhead={playback.playhead}
        onScrub={playback.setPlayhead}
        markers={composer.markers}
        onMarkerMove={composer.moveMarker}
        audio={audio.analysis}
        animation={studio.animation.analysis}
        animationDocument={studio.animation.source?.document}
        riveCues={riveCues}
        getPlayhead={riveCues ? session.elapsedMs : undefined}
        onBegin={document.begin}
        durationMs={Math.max(
          audio.analysis?.durationMs ?? 0,
          studio.animation.source?.durationMs ?? 0,
          document.preset.editor?.durationMs ?? 0,
        )}
      />
    </main>
  );
}
