import { MAX_PATTERN_MS, patternEnd } from "@buzzzz/core";
import type { CSSProperties } from "react";
import { Chart } from "../features/composer/Chart";
import { COLORS, type Layer } from "../features/composer/model";
import { TimelinePanel } from "../features/composer/TimelinePanel";
import { RivePanel } from "../features/rive/RivePanel";
import { AnimationPreview } from "../features/animation/AnimationPreview";
import { Play, Plus, Stop } from "../components/icons";
import type { Studio } from "./useStudio";
import { useAnalysisCurves } from "./useAnalysisCurves";
import { ProjectStatus } from "../features/project/ProjectStatus";

const LAYERS: { id: Layer; label: string; key: string }[] = [
  { id: "amplitude", label: "Intensity", key: "1" },
  { id: "frequency", label: "Frequency", key: "2" },
  { id: "discrete", label: "Taps", key: "3" },
];
interface IEditorCanvas {
  studio: Studio;
}
export function EditorCanvas(props: IEditorCanvas) {
  const { studio } = props;
  const { document, composer, playback, session, audio } = studio;
  const curves = useAnalysisCurves(audio);
  const addPoint = () => {
    const next = structuredClone(document.pattern);
    const time = Math.min(MAX_PATTERN_MS, playback.playhead ?? patternEnd(next) + 100);
    const layer = composer.layer;
    document.begin();
    if (layer === "discrete") {
      next.discretePattern.push({ time, amplitude: 0.5, frequency: 0.5 });
      composer.setSelected({ layer, index: next.discretePattern.length - 1 });
    } else {
      next.continuousPattern[layer].push({ time, value: 0.5 });
      composer.setSelected({ layer, index: next.continuousPattern[layer].length - 1 });
    }
    document.setPattern(next);
  };
  return (
    <main className="editor-canvas">
      <header className="pattern-header">
        <input
          className="name"
          aria-label="Pattern name"
          value={document.preset.name}
          disabled={!document.isWriter}
          onFocus={document.begin}
          onChange={(event) => document.rename(event.target.value)}
        />
        <ProjectStatus
          status={document.status}
          storageError={document.storageError}
          onTakeOver={document.takeOver}
          onResolve={document.resolveConflict}
        />
        <button
          className="primary play"
          onClick={() =>
            playback.playing
              ? playback.stop()
              : playback.play(document.pattern, composer.range ?? undefined)
          }
        >
          {playback.playing ? <Stop /> : <Play />}
          <span>{playback.playing ? "Stop" : "Play"}</span>
        </button>
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
        className={`canvas-scroll ${studio.animation.source ? `preview-${studio.animation.previewMode}` : ""}`}
      >
        <section className="chart-card" aria-label="Pattern editor">
          <div className="chart-head">
            <div className="seg layers" role="group" aria-label="Active layer">
              {LAYERS.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={composer.layer === item.id}
                  className={composer.layer === item.id ? "on" : ""}
                  style={{ "--c": COLORS[item.id] } as CSSProperties}
                  onClick={() => composer.setLayer(item.id)}
                >
                  <i />
                  {item.label}
                  <kbd>{item.key}</kbd>
                </button>
              ))}
            </div>
            <button onClick={addPoint}>
              <Plus /> Add point
            </button>
          </div>
          <Chart
            pattern={document.pattern}
            layer={composer.layer}
            viewMs={composer.viewport.durationMs}
            viewStartMs={composer.viewport.startMs}
            selected={composer.selected}
            selection={composer.selection}
            onSelect={composer.setSelected}
            onSelectionChange={composer.setSelection}
            playhead={playback.playhead}
            onScrub={playback.setPlayhead}
            onBegin={document.begin}
            onChange={document.setPattern}
            visibleLayers={composer.visibleLayers}
            snapMs={composer.snapMs}
            playbackRange={composer.range ?? undefined}
            markers={composer.markers}
            onViewChange={composer.setViewport}
            onError={studio.setError}
            analysisCurves={curves}
          />
          <div className="chart-caption">
            <span>Double-click to draw · Shift-drag to lock an axis</span>
            <span>
              {composer.selection.length
                ? `${composer.selection.length} selected`
                : `${Math.round(patternEnd(document.pattern))} ms`}
            </span>
          </div>
        </section>
        <AnimationPreview animation={studio.animation} onSeek={playback.setPlayhead} />
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
        pattern={document.pattern}
        viewport={composer.viewport}
        onViewChange={composer.setViewport}
        range={composer.range}
        onRangeChange={composer.setRange}
        playhead={playback.playhead}
        onScrub={playback.setPlayhead}
        markers={composer.markers}
        audio={audio.analysis}
        animation={studio.animation.analysis}
        onBegin={document.begin}
        durationMs={Math.max(
          audio.analysis?.durationMs ?? 0,
          studio.animation.source?.durationMs ?? 0,
          document.preset.editor?.durationMs ?? 0,
        )}
        onZoom={composer.zoom}
        onFit={() =>
          composer.fit(
            Math.max(
              patternEnd(document.pattern),
              audio.analysis?.durationMs ?? 0,
              studio.animation.source?.durationMs ?? 0,
              document.preset.editor?.durationMs ?? 0,
            ),
          )
        }
      />
    </main>
  );
}
