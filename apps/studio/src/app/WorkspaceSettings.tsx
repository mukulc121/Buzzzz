import { useState, type ReactNode } from "react";
import { ThemeChooser } from "./ThemeChooser";
import { InspectorSwitch } from "./inspector/InspectorSwitch";
import { HelpPopover } from "../components/HelpPopover";
import type { GridDensity } from "../features/composer/editorSettings";
import { Select } from "../components/Select";
import { SettingsShortcuts } from "./settings/SettingsShortcuts";
import { SettingsHelpIcon } from "./settings/SettingsHelpIcon";
import { completedWalkthroughs } from "../features/learn/storage";
import { WALKTHROUGHS } from "../features/learn/tours";
import type { Studio } from "./useStudio";

interface IWorkspaceSettings {
  studio: Studio;
  onShowOnboarding: () => void;
}
interface ISettingsSection {
  title: string;
  children: ReactNode;
}
interface ISettingsLabel {
  text: string;
  hint: string;
  helpLabel?: string;
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
      <HelpPopover text={props.hint} label={props.helpLabel ?? props.text} />
    </span>
  );
}
const DENSITIES: { value: GridDensity; label: string; hint: string }[] = [
  { value: "off", label: "Off", hint: "No gridlines or axis labels - just the chart." },
  {
    value: "sparse",
    label: "Sparse",
    hint: "Widely spaced lines, labels only. Least visual noise.",
  },
  {
    value: "normal",
    label: "Normal",
    hint: "Balanced spacing, with faint lines between the labeled ones.",
  },
  {
    value: "dense",
    label: "Dense",
    hint: "Tight spacing and more subdivisions, for precise placement.",
  },
];
const PRECISIONS = [
  { value: 0, label: "1%" },
  { value: 1, label: "0.1%" },
  { value: 2, label: "0.01%" },
] as const;
export function WorkspaceSettings(props: IWorkspaceSettings) {
  const { studio } = props;
  const [completed] = useState(completedWalkthroughs);
  const { composer } = studio;
  const { values, update } = composer.settings;
  return (
    <div className="settings-panel" aria-label="Editor settings">
      <SettingsSection title="Appearance">
        <div className="settings-field">
          <SettingsLabel
            text="Theme"
            hint="“System” follows your operating system and switches automatically when it does."
          />
          <ThemeChooser theme={studio.appearance.theme} setTheme={studio.appearance.setTheme} />
        </div>
      </SettingsSection>
      <SettingsSection title="Grid">
        <div className="settings-field">
          <SettingsLabel
            text="Density"
            helpLabel="Grid density"
            hint={DENSITIES.find((item) => item.value === values.gridDensity)?.hint ?? ""}
          />
          <Select
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
            helpLabel="Value precision"
            hint={`How finely intensity and frequency can be set - ${(0.453 * 100).toFixed(values.valueDecimals)}% at this precision. Values are shown as a percentage; presets still store them as 0-1 for the Pulsar SDK. Changing this only affects new edits.`}
          />
          <Select
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
          info="Rails on both axes follow the pointer over the chart, reading out the exact time and value under it."
          checked={values.crosshair}
          onChange={(value) => update("crosshair", value)}
        />
      </SettingsSection>
      <SettingsSection title="Playback">
        <InspectorSwitch
          label="Time cursor"
          info="The violet line over the chart marking the current time, with its readout - drawn whether or not audio or an animation is attached. The matching needle on the lanes below stays either way, so the time can still be dragged."
          checked={values.timeCursor}
          onChange={(value) => update("timeCursor", value)}
        />
      </SettingsSection>
      <SettingsSection title="Selection">
        <InspectorSwitch
          label="Multilayer selection"
          info="Marquee selection spans every visible layer instead of only the active one."
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
        <p className="settings-note">
          Four walkthroughs cover drawing a pattern, pairing a phone, and generating one from audio
          or animation - {completed.length} of {WALKTHROUGHS.length} done.
        </p>
        <div className="settings-help-actions">
          <button type="button" className="primary" onClick={props.onShowOnboarding}>
            <SettingsHelpIcon name="learn" />
            <span>Show onboarding</span>
          </button>
          <a
            className="settings-docs-link"
            href="https://docs.swmansion.com/pulsar/studio/"
            target="_blank"
            rel="noreferrer"
          >
            <SettingsHelpIcon name="book" />
            Documentation
            <SettingsHelpIcon name="arrow" size={14} />
          </a>
        </div>
      </SettingsSection>
    </div>
  );
}
