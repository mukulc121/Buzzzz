import type { ReactNode } from "react";
import { ThemeChooser } from "./ThemeChooser";
import { InspectorSwitch } from "./inspector/InspectorSwitch";
import { InspectorIcon } from "../components/InspectorIcon";
import type { GridDensity } from "../features/composer/editorSettings";
import { SettingsSelect } from "./settings/SettingsSelect";
import { SettingsShortcuts } from "./settings/SettingsShortcuts";
import type { Studio } from "./useStudio";

interface IWorkspaceSettings {
  studio: Studio;
}
interface ISettingsSection {
  title: string;
  children: ReactNode;
}
interface ISettingsLabel {
  text: string;
  hint: string;
}
function SettingsSection(props: ISettingsSection) {
  return (
    <section className="settings-section">
      <h3>{props.title}</h3>
      {props.children}
    </section>
  );
}
function SettingsLabel(props: ISettingsLabel) {
  return (
    <span className="settings-label">
      <span>{props.text}</span>
      <span className="inspector-info" role="img" aria-label={props.hint} title={props.hint}>
        <InspectorIcon name="info" />
      </span>
    </span>
  );
}
const DENSITIES: { value: GridDensity; label: string; hint: string }[] = [
  { value: "off", label: "Off", hint: "No gridlines or axis labels, just the chart." },
  { value: "sparse", label: "Sparse", hint: "Widely spaced lines and labels." },
  {
    value: "normal",
    label: "Normal",
    hint: "Balanced spacing, with faint lines between the labeled ones.",
  },
  {
    value: "dense",
    label: "Dense",
    hint: "Tight spacing and more subdivisions for precise placement.",
  },
];
const PRECISIONS = [
  { value: 0, label: "1%" },
  { value: 1, label: "0.1%" },
  { value: 2, label: "0.01%" },
] as const;
export function WorkspaceSettings(props: IWorkspaceSettings) {
  const { studio } = props;
  const { composer } = studio;
  const { values, update } = composer.settings;
  return (
    <div className="settings-panel" aria-label="Editor settings">
      <SettingsSection title="Appearance">
        <div className="settings-field">
          <SettingsLabel
            text="Theme"
            hint="System follows your operating system and switches automatically when it does."
          />
          <ThemeChooser theme={studio.appearance.theme} setTheme={studio.appearance.setTheme} />
        </div>
      </SettingsSection>
      <SettingsSection title="Grid">
        <div className="settings-field">
          <SettingsLabel
            text="Density"
            hint={DENSITIES.find((item) => item.value === values.gridDensity)?.hint ?? ""}
          />
          <SettingsSelect
            label="Grid density"
            value={values.gridDensity}
            options={DENSITIES}
            onChange={(value) => update("gridDensity", value)}
          />
        </div>
      </SettingsSection>
      <SettingsSection title="Values">
        <div className="settings-field">
          <SettingsLabel
            text="Precision"
            hint="Controls the precision of new intensity and frequency edits. Existing values are kept until you edit them."
          />
          <SettingsSelect
            label="Value precision"
            value={values.valueDecimals}
            options={PRECISIONS}
            onChange={(value) => update("valueDecimals", value)}
          />
        </div>
      </SettingsSection>
      <SettingsSection title="Pointer">
        <InspectorSwitch
          label="Crosshair rails"
          info="Rails on both axes follow the pointer and show its time and value."
          checked={values.crosshair}
          onChange={(value) => update("crosshair", value)}
        />
      </SettingsSection>
      <SettingsSection title="Playback">
        <InspectorSwitch
          label="Time cursor"
          info="Show the violet time line over the chart. The timeline needle remains available when this is off."
          checked={values.timeCursor}
          onChange={(value) => update("timeCursor", value)}
        />
      </SettingsSection>
      <SettingsSection title="Selection">
        <InspectorSwitch
          label="Multilayer selection"
          info="Marquee selection spans every visible layer instead of only the active layer."
          checked={values.multilayerSelection}
          onChange={(value) => {
            composer.setMultilayerSelection(value);
            if (!value) composer.setSelected(composer.selected);
          }}
        />
      </SettingsSection>
      <SettingsSection title="Shortcuts">
        <SettingsShortcuts />
      </SettingsSection>
      <SettingsSection title="Help">
        <a
          className="settings-docs-link"
          href="https://docs.swmansion.com/pulsar/"
          target="_blank"
          rel="noreferrer"
        >
          Documentation ↗
        </a>
        <p className="settings-note">
          Projects and media save in this browser. Pairing rooms and shared links expire after 24
          hours.
        </p>
      </SettingsSection>
    </div>
  );
}
