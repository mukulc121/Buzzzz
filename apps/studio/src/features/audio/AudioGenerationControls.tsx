import { GENERATION_INFO, GENERATION_SETTINGS } from "./generation/options";
import { SoundParameter } from "./SoundParameter";
import { SoundSection } from "./SoundSection";
import type { useAudioTrack } from "./useAudioTrack";

interface IAudioGenerationControls {
  generation: ReturnType<typeof useAudioTrack>["generation"];
}

function GenerationSettings(props: IAudioGenerationControls) {
  const { generation } = props;
  return (
    <details className="sound-generation-settings">
      <summary>Generation settings</summary>
      <div className="sound-settings-body">
        <p className="sound-metric-hint">
          Shared by every approach; a change re-runs them. <strong>Contrast</strong> suppresses
          low-level buzz and sharpens hits (the fix for flat, mushy output).
        </p>
        {GENERATION_SETTINGS.map((setting) => (
          <SoundParameter
            key={setting.key}
            label={setting.label}
            min={setting.min}
            max={setting.max}
            step={setting.step}
            unit={setting.suffix}
            value={generation.options[setting.key]}
            onChange={(value) => generation.setOption(setting.key, value)}
          />
        ))}
        <button type="button" className="sound-text-action" onClick={generation.resetOptions}>
          Reset to defaults
        </button>
      </div>
    </details>
  );
}

export function AudioGenerationControls(props: IAudioGenerationControls) {
  const { generation } = props;
  const run = generation.run;
  return (
    <SoundSection title="Generate" description={GENERATION_INFO}>
      {run?.status === "running" && (
        <p className="sound-working" role="status">
          Analyzing…
        </p>
      )}
      <GenerationSettings generation={generation} />
      {run?.status === "error" && (
        <>
          <p className="sound-error" role="alert">
            {run.error}
          </p>
          <button type="button" className="sound-secondary-action" onClick={generation.retry}>
            Try again
          </button>
        </>
      )}
    </SoundSection>
  );
}
