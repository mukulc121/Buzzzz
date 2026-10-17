import { useId } from "react";
import { HelpPopover } from "../../components/HelpPopover";

interface IInspectorSwitch {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  info?: string;
}
export function InspectorSwitch(props: IInspectorSwitch) {
  const { label, checked, onChange, disabled, info } = props;
  const id = useId();
  return (
    <div className="inspector-switch-row">
      <span className="inspector-switch-label-row">
        <label htmlFor={id}>{label}</label>
        {info && <HelpPopover text={info} label={label} />}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}
