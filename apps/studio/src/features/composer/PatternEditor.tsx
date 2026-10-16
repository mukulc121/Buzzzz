import { MAX_PATTERN_MS, patternEnd, type Pattern } from "@buzzzz/core";
import type { CSSProperties } from "react";
import { Chart } from "./Chart";
import { COLORS, type Layer, type Selection } from "./model";
import { Play, Plus, Stop } from "../../components/icons";
interface IPatternEditor {
  name: string;
  rename: (name: string) => void;
  sound: boolean;
  setSound: (value: boolean) => void;
  phones: number;
  onPhone: boolean;
  setOnPhone: (value: boolean) => void;
  playing: boolean;
  stop: () => void;
  play: (pattern: Pattern) => void;
  pattern: Pattern;
  layer: Layer;
  setLayer: (layer: Layer) => void;
  selected: Selection;
  setSelected: (selection: Selection) => void;
  playhead: number | null;
  begin: () => void;
  setPattern: (pattern: Pattern) => void;
  editSel: (field: string, value: number) => void;
}
const LAYERS: { id: Layer; label: string; key: string }[] = [
  { id: "amplitude", label: "Intensity", key: "1" },
  { id: "frequency", label: "Frequency", key: "2" },
  { id: "discrete", label: "Taps", key: "3" },
];
export function PatternEditor(props: IPatternEditor) {
  const {
    name,
    rename,
    sound,
    setSound,
    phones,
    onPhone,
    setOnPhone,
    playing,
    stop,
    play,
    pattern,
    layer,
    setLayer,
    selected,
    setSelected,
    playhead,
    begin,
    setPattern,
    editSel,
  } = props;
  const sel =
    selected &&
    (selected.layer === "discrete"
      ? pattern.discretePattern[selected.index]
      : pattern.continuousPattern[selected.layer][selected.index]);
  const viewMs = Math.max(1000, Math.ceil((patternEnd(pattern) + 250) / 500) * 500);
  const addPoint = () => {
    begin();
    const next = structuredClone(pattern);
    const time = Math.min(MAX_PATTERN_MS, patternEnd(pattern) + 100);
    if (layer === "discrete") {
      next.discretePattern.push({ time, amplitude: 0.5, frequency: 0.5 });
      setSelected({ layer, index: next.discretePattern.length - 1 });
    } else {
      next.continuousPattern[layer].push({ time, value: 0.5 });
      setSelected({ layer, index: next.continuousPattern[layer].length - 1 });
    }
    setPattern(next);
  };
  return (
    <>
      <div className="toolbar">
        <input
          className="name"
          value={name}
          aria-label="Pattern name"
          onFocus={begin}
          onChange={(e) => rename(e.target.value)}
        />
        <span className="spacer" />
        <label className="chip">
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />{" "}
          Sound
        </label>
        <label
          className={phones ? "chip" : "chip disabled"}
          title={phones ? "" : "No phone connected"}
        >
          <input
            type="checkbox"
            checked={onPhone}
            disabled={!phones}
            onChange={(e) => setOnPhone(e.target.checked)}
          />{" "}
          Phone
        </label>
        <button className="primary play" onClick={() => (playing ? stop() : play(pattern))}>
          {playing ? <Stop /> : <Play />} {playing ? "Stop" : "Play"} <kbd>Space</kbd>
        </button>
      </div>

      <div className="chart-card">
        <div className="chart-head">
          <div className="seg layers">
            {LAYERS.map((l) => (
              <button
                key={l.id}
                className={l.id === layer ? "on" : ""}
                aria-pressed={l.id === layer}
                onClick={() => setLayer(l.id)}
                style={{ "--c": COLORS[l.id] } as CSSProperties}
              >
                <i /> {l.label} <kbd>{l.key}</kbd>
              </button>
            ))}
          </div>
          <button onClick={addPoint}>
            <Plus /> Add point
          </button>
          <span className="muted small">
            Double-click to add · drag to move · ⌫ delete · ⌘Z undo
          </span>
        </div>
        <Chart
          pattern={pattern}
          layer={layer}
          viewMs={viewMs}
          selected={selected}
          playhead={playhead}
          onSelect={setSelected}
          onBegin={begin}
          onChange={setPattern}
        />
        <div className="inspector">
          {sel ? (
            <>
              <strong style={{ "--c": COLORS[selected!.layer] } as CSSProperties}>
                <i />{" "}
                {selected!.layer === "discrete"
                  ? "Tap"
                  : selected!.layer === "amplitude"
                    ? "Intensity point"
                    : "Frequency point"}
              </strong>
              <label>
                Time{" "}
                <input
                  type="number"
                  min={0}
                  value={Math.round(sel.time)}
                  onFocus={begin}
                  onChange={(e) => editSel("time", +e.target.value)}
                />{" "}
                <span className="unit">ms</span>
              </label>
              {"value" in sel ? (
                <label>
                  Value{" "}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(sel.value * 100)}
                    onFocus={begin}
                    onChange={(e) => editSel("value", +e.target.value)}
                  />{" "}
                  <span className="unit">%</span>
                </label>
              ) : (
                <>
                  <label>
                    Intensity{" "}
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(sel.amplitude * 100)}
                      onFocus={begin}
                      onChange={(e) => editSel("amplitude", +e.target.value)}
                    />{" "}
                    <span className="unit">%</span>
                  </label>
                  <label>
                    Frequency{" "}
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(sel.frequency * 100)}
                      onFocus={begin}
                      onChange={(e) => editSel("frequency", +e.target.value)}
                    />{" "}
                    <span className="unit">%</span>
                  </label>
                </>
              )}
            </>
          ) : (
            <dl className="stats">
              <div>
                <dt>Intensity</dt>
                <dd>{pattern.continuousPattern.amplitude.length}</dd>
              </div>
              <div>
                <dt>Frequency</dt>
                <dd>{pattern.continuousPattern.frequency.length}</dd>
              </div>
              <div>
                <dt>Taps</dt>
                <dd>{pattern.discretePattern.length}</dd>
              </div>
              <div>
                <dt>Length</dt>
                <dd>{patternEnd(pattern)} ms</dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </>
  );
}
