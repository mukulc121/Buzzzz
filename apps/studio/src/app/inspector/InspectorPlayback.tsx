import { MAX_PATTERN_MS, patternEnd } from "@buzzzz/core";
import type { Studio } from "../useStudio";
import { InspectorSection } from "../../components/InspectorSection";
import { InspectorSwitch } from "./InspectorSwitch";
import { InspectorIcon } from "../../components/InspectorIcon";
import { InspectorNumber } from "../../components/InspectorNumber";

interface IInspectorPlayback {
  studio: Studio;
}
export function InspectorPlayback(props: IInspectorPlayback) {
  const { document, composer, audio, animation, playback } = props.studio;
  const duration = Math.min(
    MAX_PATTERN_MS,
    Math.max(
      10,
      patternEnd(document.pattern),
      audio.analysis?.durationMs ?? 0,
      animation.source?.durationMs ?? 0,
      document.preset.editor?.durationMs ?? 0,
    ),
  );
  const range = composer.range ?? { start: 0, end: duration };
  const update = (field: "start" | "end", value: number) => {
    if (!Number.isFinite(value)) return;
    composer.setRange(
      field === "start"
        ? { start: Math.max(0, Math.min(range.end - 10, value)), end: range.end }
        : { start: range.start, end: Math.min(MAX_PATTERN_MS, Math.max(range.start + 10, value)) },
    );
  };
  return (
    <InspectorSection
      title="Playback range"
      description="Everything plays between these two markers - the haptics, an attached audio track and an attached animation. Drag them on any timeline, or type the exact times. Play starts at the violet time cursor when it sits inside the range, and at the start marker otherwise."
    >
      <div className="inspector-range-fields">
        {(["start", "end"] as const).map((field) => (
          <div key={field}>
            <span>{field === "start" ? "Start" : "End"}</span>
            <InspectorNumber
              label={`Playback range ${field}`}
              value={Math.round(range[field])}
              min={field === "start" ? 0 : range.start + 10}
              max={field === "start" ? range.end - 10 : MAX_PATTERN_MS}
              unit="ms"
              onBegin={document.begin}
              onChange={(value) => update(field, value)}
            />
          </div>
        ))}
      </div>
      <InspectorSwitch
        label="Loop"
        info="At the end marker, start the range again - the haptics, the audio and the animation together - until you press stop."
        checked={playback.loop}
        onChange={playback.setLoop}
      />
      <button
        className="inspector-text-action"
        type="button"
        disabled={!composer.range}
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
