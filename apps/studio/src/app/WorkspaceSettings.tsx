import type { Studio } from "./useStudio";
interface IWorkspaceSettings {
  studio: Studio;
}
export function WorkspaceSettings(props: IWorkspaceSettings) {
  const { studio } = props;
  return (
    <section className="panel-content">
      <h3>Appearance</h3>
      <div className="seg">
        {(["system", "light", "dark"] as const).map((theme) => (
          <button
            key={theme}
            aria-pressed={studio.appearance.theme === theme}
            onClick={() => studio.appearance.setTheme(theme)}
          >
            {theme}
          </button>
        ))}
      </div>
      <h3>Keyboard shortcuts</h3>
      <dl className="shortcut-list">
        <dt>Play / stop</dt>
        <dd>Space or P</dd>
        <dt>Undo / redo</dt>
        <dd>⌘Z / ⌘⇧Z</dd>
        <dt>Active layer</dt>
        <dd>1 / 2 / 3</dd>
        <dt>Copy / paste points</dt>
        <dd>⌘C / ⌘V</dd>
        <dt>Zoom</dt>
        <dd>+ / −</dd>
        <dt>Add marker</dt>
        <dd>M</dd>
        <dt>Clear selection</dt>
        <dd>Esc</dd>
      </dl>
      <p className="hint">
        Projects and media save in this browser. Pairing rooms and shared links expire after 24
        hours.
      </p>
    </section>
  );
}

export function LearnPanel() {
  return (
    <section className="panel-content">
      <h3>Build a haptic pattern</h3>
      <ol className="steps">
        <li>Double-click the canvas to add points.</li>
        <li>Switch between Intensity, Frequency and Taps.</li>
        <li>Attach audio or Lottie to generate a pattern, or map a Rive trigger.</li>
        <li>Connect your phone and press Play.</li>
      </ol>
      <a href="https://docs.swmansion.com/pulsar/" target="_blank" rel="noreferrer">
        Pulsar format documentation ↗
      </a>
    </section>
  );
}
