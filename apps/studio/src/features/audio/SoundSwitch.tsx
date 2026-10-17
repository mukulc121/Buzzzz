import { SoundInfo } from "./SoundSection";

interface ISoundSwitch {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export function SoundSwitch(props: ISoundSwitch) {
  const { label, checked, onChange, description } = props;
  return (
    <label className="sound-switch">
      <span>
        {label}
        {description && <SoundInfo description={description} />}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </label>
  );
}
