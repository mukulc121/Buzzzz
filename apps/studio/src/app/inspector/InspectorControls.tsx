import type { Studio } from "../useStudio";
import { InspectorIcon } from "../../components/InspectorIcon";
import { InspectorSection } from "../../components/InspectorSection";

interface IInspectorControls {
  studio: Studio;
}
export function InspectorControls(props: IInspectorControls) {
  const { document, composer } = props.studio;
  const controls = [
    { label: "Undo", icon: "undo", onClick: document.undo, disabled: !document.canUndo },
    { label: "Redo", icon: "redo", onClick: document.redo, disabled: !document.canRedo },
    { label: "Pan left", icon: "left", onClick: () => composer.pan(-1) },
    { label: "Pan right", icon: "right", onClick: () => composer.pan(1) },
    { label: "Zoom out", icon: "zoomOut", onClick: () => composer.zoom(1.5) },
    { label: "Zoom in", icon: "zoomIn", onClick: () => composer.zoom(1 / 1.5) },
  ] as const;
  return (
    <InspectorSection
      title="Controls"
      description="Undo edits, move the visible time window, or zoom the chart."
    >
      <div className="inspector-controls">
        {[controls.slice(0, 2), controls.slice(2, 4), controls.slice(4, 6)].map((group, index) => (
          <div className="inspector-control-group" key={index}>
            {group.map((control) => (
              <button
                key={control.label}
                type="button"
                aria-label={control.label}
                title={control.label}
                disabled={"disabled" in control && control.disabled}
                onClick={control.onClick}
              >
                <InspectorIcon name={control.icon} />
              </button>
            ))}
          </div>
        ))}
      </div>
    </InspectorSection>
  );
}
