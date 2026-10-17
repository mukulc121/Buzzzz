import { MAX_PATTERN_MS, patternEnd, type IPresetEditor } from "@buzzzz/core";
import type { Studio } from "../useStudio";
import { InspectorSection } from "../../components/InspectorSection";
import { InspectorSwitch } from "./InspectorSwitch";
import { InspectorIcon } from "../../components/InspectorIcon";
import { InspectorNumber } from "../../components/InspectorNumber";

function updateRange(
  range: NonNullable<IPresetEditor["range"]>,
  duration: number,
  field: "start" | "end",
  value: number,
): IPresetEditor["range"] {
  const end = Math.min(duration, Math.max(10, Math.round(range.end)));
  const start = Math.min(Math.max(0, Math.round(range.start)), end - 10);
  const next =
    field === "start"
      ? { start: Math.max(0, Math.min(end - 10, Math.round(value))), end }
      : { start, end: Math.min(duration, Math.max(start + 10, Math.round(value))) };
  return next.start === 0 && next.end === duration ? null : next;
}

interface IInspectorPlayback {
  studio: Studio;
}
export function InspectorPlayback(props: IInspectorPlayback) {
  const { document, composer, audio, animation, playback } = props.studio;
  const hasAuthoredPoints =
    document.pattern.discretePattern.length +
      document.pattern.continuousPattern.amplitude.length +
      document.pattern.continuousPattern.frequency.length >
    0;
  const riveTimeline =
    props.studio.session.riv && !hasAuthoredPoints ? props.studio.riveTimeline : null;
  const duration = Math.min(
    MAX_PATTERN_MS,
    Math.round(
      Math.max(
        10,
        patternEnd(document.pattern),
        audio.analysis?.durationMs ?? 0,
        animation.source?.durationMs ?? 0,
        document.preset.editor?.durationMs ?? 0,
        riveTimeline?.durationMs ?? 0,
      ),
    ),
  );
  const range = (riveTimeline ? null : composer.range) ?? { start: 0, end: duration };
  const update = (field: "start" | "end", value: number) => {
    if (riveTimeline || !Number.isFinite(value)) return;
    composer.setRange(updateRange(range, duration, field, value));
  };
  return (
    <InspectorSection
      title="Playback range"
      description={
        riveTimeline
          ? "Timing follows the animation's entry, loop and exit."
          : "Everything plays between these two markers - the haptics, an attached audio track and an attached animation. Drag them on any timeline, or type the exact times. Play starts at the violet time cursor when it sits inside the range, and at the start marker otherwise."
      }
    >
      <div className="inspector-range-fields">
        {(["start", "end"] as const).map((field) => (
          <div key={field}>
            <span>{field === "start" ? "Start" : "End"}</span>
            <InspectorNumber
              label={`Playback range ${field}`}
              value={Math.round(range[field])}
              min={field === "start" ? 0 : Math.min(range.start + 10, duration)}
              max={field === "start" ? Math.max(0, Math.min(range.end, duration) - 10) : duration}
              step={10}
              unit="ms"
              onBegin={document.begin}
              onChange={(value) => update(field, value)}
              readOnly={Boolean(riveTimeline)}
            />
          </div>
        ))}
      </div>
      <InspectorSwitch
        label="Loop"
        info="At the end marker, start the range again - the haptics, the audio and the animation together - until you press stop."
        checked={!riveTimeline && playback.loop}
        disabled={Boolean(riveTimeline)}
        onChange={playback.setLoop}
      />
      <button
        className="inspector-text-action"
        type="button"
        disabled={range.start === 0 && range.end === duration}
        onClick={() => {
          document.begin();
          composer.setRange(null);
        }}
      >
        <InspectorIcon name="fit" />
        Play the whole preset
      </button>
    </InspectorSection>
  );
}
