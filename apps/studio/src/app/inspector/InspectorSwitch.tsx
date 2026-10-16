interface IInspectorSwitch {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
  info?: string;
}
export function InspectorSwitch(props: IInspectorSwitch) {
  const { label, checked, onChange, disabled, description, info } = props;
  return (
    <label className="inspector-switch-row" title={description}>
      <span>
        {label}
        {info && (
          <span className="inspector-info" role="img" aria-label={info} title={info}>
            <InspectorIcon name="info" />
          </span>
        )}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
import { InspectorIcon } from "../../components/InspectorIcon";
