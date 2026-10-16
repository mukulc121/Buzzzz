import { Select } from "../../components/Select";
import { SoundParameter } from "../audio/SoundParameter";
import { SoundSwitch } from "../audio/SoundSwitch";
import type { IVoiceOptions } from "../audio/voice/pattern";

interface IVoiceShape {
  options: IVoiceOptions;
  onChange: (options: IVoiceOptions) => void;
}

export function VoiceShape(props: IVoiceShape) {
  const { options, onChange } = props;
  return (
    <section>
      <h3>Shape</h3>
      <div className="voice-field">
        <span>Frequency from</span>
        <Select
          label="Frequency source"
          value={options.frequency}
          options={[
            { value: "pitch", label: "Hummed pitch" },
            { value: "brightness", label: "Brightness" },
          ]}
          onChange={(frequency) => onChange({ ...options, frequency })}
        />
      </div>
      <SoundParameter
        label="Smoothing"
        value={options.releaseMs}
        min={10}
        max={400}
        step={5}
        unit="ms"
        onChange={(releaseMs) => onChange({ ...options, releaseMs })}
      />
      <SoundParameter
        label="Noise floor"
        value={options.floorDb}
        min={-70}
        max={-20}
        unit="dB"
        onChange={(floorDb) => onChange({ ...options, floorDb })}
      />
      <SoundParameter
        label="Punch"
        value={options.contrast}
        min={0}
        max={1}
        step={0.05}
        onChange={(contrast) => onChange({ ...options, contrast })}
      />
      <SoundSwitch
        label="Accent the attacks"
        checked={options.accents}
        onChange={(accents) => onChange({ ...options, accents })}
      />
      <p className="voice-hint">
        Puts a discrete event where each syllable starts - a "da-da-da" lands as taps, a held "mmm"
        as nothing.
      </p>
    </section>
  );
}
