import type { Studio } from "../useStudio";
import { InspectorSection } from "../../components/InspectorSection";
import { InspectorSwitch } from "./InspectorSwitch";

const layers = [
  { id: "amplitude", label: "Intensity" },
  { id: "frequency", label: "Frequency" },
  { id: "discrete", label: "Discrete" },
] as const;
interface IInspectorLayers {
  composer: Studio["composer"];
}
export function InspectorLayers(props: IInspectorLayers) {
  const { composer } = props;
  return (
    <InspectorSection title="Layers">
      <div className="inspector-layers">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className="inspector-layer"
            data-layer={layer.id}
            data-active={composer.layer === layer.id}
          >
            <label className="inspector-layer-choice">
              <input
                type="radio"
                name="active-layer"
                aria-label={`Edit ${layer.label.toLowerCase()}`}
                checked={composer.layer === layer.id}
                onChange={() => composer.setLayer(layer.id)}
              />
              <span className="inspector-layer-swatch" />
              <span>{layer.label}</span>
            </label>
            <input
              className="inspector-layer-toggle"
              type="checkbox"
              role="switch"
              aria-label={`Show ${layer.id}`}
              checked={composer.visibleLayers.includes(layer.id)}
              onChange={() => composer.toggleLayer(layer.id)}
            />
          </div>
        ))}
      </div>
      <div className="inspector-layer-options">
        <InspectorSwitch
          label="Multilayer selection"
          checked={composer.multilayerSelection}
          onChange={(enabled) => {
            composer.setMultilayerSelection(enabled);
            if (!enabled) composer.setSelected(composer.selected);
          }}
        />
      </div>
    </InspectorSection>
  );
}
