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

interface IEditorCanvas {
  studio: Studio;
}
export function EditorCanvas(props: IEditorCanvas) {
  const { studio } = props;
  const { document, composer, playback, session, audio } = studio;
  const curves = useAnalysisCurves(audio);
  const markerDurationMs = Math.max(
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
          {...playButton}
          onClick={studio.togglePlayback}
        />
        <button
          className="icon inspector-toggle"
          aria-label={studio.inspectorOpen ? "Hide inspector" : "Show inspector"}
          aria-expanded={studio.inspectorOpen}
          onClick={() => studio.setInspectorOpen(!studio.inspectorOpen)}
        >
          ☷
        </button>
      </header>
      <div
        className={`canvas-scroll ${studio.animation.source && studio.animation.previewVisible ? `preview-${studio.animation.previewMode}` : ""}`}
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
          <Chart
            pattern={document.pattern}
            layer={composer.layer}
            viewMs={composer.viewport.durationMs}
            viewStartMs={composer.viewport.startMs}
            selected={composer.selected}
            selection={composer.selection}
            onSelect={composer.setPrimarySelection}
            onSelectionChange={composer.setSelection}
            playhead={playback.playhead}
            onScrub={playback.setPlayhead}
            onBegin={document.begin}
            onChange={document.setPattern}
            visibleLayers={composer.visibleLayers}
            snapMs={composer.snapMs}
            multilayerSelection={composer.multilayerSelection}
            editorSettings={composer.settings.values}
            playbackRange={composer.range ?? undefined}
            markers={composer.markers}
            markerDurationMs={markerDurationMs}
            onMarkerMove={composer.moveMarker}
            onMarkerRename={composer.renameMarker}
            onViewChange={composer.setViewport}
            onError={studio.setError}
            analysisCurves={curves}
          />
        </section>
        {studio.animation.previewVisible && (
          <AnimationPreview
            animation={studio.animation}
            seekMs={playback.playhead ?? studio.animation.seekMs}
          />
        )}
        {session.riv && (
          <RivePanel
            riv={session.riv}
            canvas={session.canvas}
            info={session.info}
            stateMachine={session.stateMachine}
            setStateMachine={session.setStateMachine}
            importFile={studio.importFile}
            restart={session.restart}
            send={session.send}
            addLog={studio.activity.addLog}
            paused={session.paused}
            setPause={session.setPause}
            project={document.project}
            begin={document.begin}
            setProject={document.setProject}
            triggerRows={session.triggerRows}
            fire={session.fire}
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
