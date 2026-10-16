import { patternEnd } from "@buzzzz/core";
import { SelectionInspector } from "../features/composer/SelectionInspector";
import { SoundPanel } from "../features/audio/SoundPanel";
import { AnimationPanel } from "../features/animation/AnimationPanel";
import type { Studio } from "./useStudio";

interface IInspectorPanel {
  studio: Studio;
}
export function InspectorPanel(props: IInspectorPanel) {
  const { studio } = props;
  const { document, composer, playback } = studio;
  return (
    <aside className="workspace-inspector" aria-label="Inspector">
      <div className="inspector-tabs" role="tablist" aria-label="Inspector sections">
        {(["inspector", "sound", "animation"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={studio.inspector === tab}
            aria-controls={`panel-${tab}`}
            id={`tab-${tab}`}
            onClick={() => studio.setInspector(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-${studio.inspector}`}
        aria-labelledby={`tab-${studio.inspector}`}
      >
        {studio.inspector === "sound" ? (
          <SoundPanel
            key={`${document.projectId}/${document.preset.id}/${studio.audio.source?.url ?? ""}`}
            audio={studio.audio}
            currentPattern={document.pattern}
            onApply={(pattern) => studio.applyGenerated(pattern)}
            onRestore={studio.restore}
            onPreserve={studio.preserve}
            onFile={studio.importFile}
            onRemove={() => void studio.media.detach("audio")}
          />
        ) : studio.inspector === "animation" ? (
          <AnimationPanel
            key={`${document.projectId}/${document.preset.id}/${studio.animation.source?.url ?? ""}/${studio.animation.source?.animationId ?? ""}`}
            animation={studio.animation}
            currentPattern={document.pattern}
            onApply={studio.applyGenerated}
            onRestore={studio.restore}
            onPreserve={studio.preserve}
            onFile={studio.importFile}
            onRemove={() => void studio.media.detach("animation")}
          />
        ) : (
          <>
            <section className="inspector-section">
              <h3>Layers</h3>
              {(["amplitude", "frequency", "discrete"] as const).map((layer) => (
                <label className="setting-row" key={layer}>
                  <span>
                    {layer === "amplitude"
                      ? "Intensity"
                      : layer === "discrete"
                        ? "Taps"
                        : "Frequency"}
                  </span>
                  <input
                    aria-label={`Show ${layer}`}
                    type="checkbox"
                    checked={composer.visibleLayers.includes(layer)}
                    onChange={() => composer.toggleLayer(layer)}
                  />
                </label>
              ))}
              <label className="setting-row">
                Time snapping
                <select
                  aria-label="Time snapping"
                  value={composer.snapMs}
                  onChange={(event) => composer.setSnapMs(+event.target.value)}
                >
                  {[0, 10, 25, 50, 100].map((value) => (
                    <option key={value} value={value}>
                      {value ? `${value} ms` : "Off"}
                    </option>
                  ))}
                </select>
              </label>
            </section>
            <section className="inspector-section">
              <h3>Controls</h3>
              <div className="control-grid">
                <button disabled={!document.canUndo} onClick={document.undo}>
                  Undo
                </button>
                <button disabled={!document.canRedo} onClick={document.redo}>
                  Redo
                </button>
                <button onClick={() => composer.pan(-1)}>← Left</button>
                <button onClick={() => composer.pan(1)}>Right →</button>
                <button onClick={() => composer.zoom(1.5)}>Zoom out</button>
                <button onClick={() => composer.zoom(1 / 1.5)}>Zoom in</button>
              </div>
            </section>
            <section className="inspector-section">
              <h3>Selection</h3>
              <SelectionInspector
                pattern={document.pattern}
                selected={composer.selected}
                begin={document.begin}
                onEdit={studio.editSelection}
              />
            </section>
            <section className="inspector-section">
              <h3>Preview</h3>
              <label className="setting-row">
                Play on device
                <input
                  type="checkbox"
                  checked={playback.onPhone}
                  disabled={!studio.session.phones}
                  onChange={(event) => playback.setOnPhone(event.target.checked)}
                />
              </label>
              <label className="setting-row">
                Haptics as sound
                <input
                  type="checkbox"
                  checked={playback.sound}
                  onChange={(event) => playback.setSound(event.target.checked)}
                />
              </label>
              <label className="setting-row">
                Audio track
                <input
                  type="checkbox"
                  checked={playback.trackEnabled}
                  disabled={!studio.audio.source}
                  onChange={(event) => playback.setTrackEnabled(event.target.checked)}
                />
              </label>
              <label className="setting-row">
                Loop
                <input
                  type="checkbox"
                  checked={playback.loop}
                  onChange={(event) => playback.setLoop(event.target.checked)}
                />
              </label>
            </section>
            <section className="inspector-section">
              <h3>Markers</h3>
              {composer.markers.map((marker) => (
                <div className="marker-row" key={marker.id}>
                  <input
                    aria-label="Marker name"
                    value={marker.label}
                    onChange={(event) =>
                      composer.setMarkers((items) =>
                        items.map((item) =>
                          item.id === marker.id ? { ...item, label: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <span>{Math.round(marker.time)} ms</span>
                  <button
                    aria-label={`Delete ${marker.label}`}
                    onClick={() =>
                      composer.setMarkers((items) => items.filter((item) => item.id !== marker.id))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button onClick={() => composer.addMarker(playback.playhead ?? 0)}>
                Add marker at cursor
              </button>
            </section>
            <section className="inspector-section">
              <h3>Pattern</h3>
              <p className="hint">
                {Math.round(patternEnd(document.pattern))} ms ·{" "}
                {document.pattern.discretePattern.length} taps ·{" "}
                {document.pattern.continuousPattern.amplitude.length +
                  document.pattern.continuousPattern.frequency.length}{" "}
                envelope points
              </p>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
