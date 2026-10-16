import { useState } from "react";
import type { Pattern } from "@buzzzz/core";
import { LazyLibrary as Library } from "../presets/LazyLibrary";
import { CompatibilityLinter } from "./CompatibilityLinter";
import { SignalAnalyzer } from "./SignalAnalyzer";
import { Snippets } from "./Snippets";
import { TapRhythm } from "./TapRhythm";
import { TimeWarp } from "./TimeWarp";
import { VoiceSketch } from "./VoiceSketch";

interface IToolsPanel {
  pattern: Pattern;
  onApply: (pattern: Pattern) => void;
  onAdd: (pattern?: Pattern, name?: string) => void;
  onError: (message: string) => void;
  onOpenAudioTrim: () => void;
  onPreview?: (pattern: Pattern) => void;
}
const TOOLS = [
  "Pulsar library",
  "Snippets",
  "Tap rhythm",
  "Voice sketch",
  "Time warp",
  "Audio trim",
  "Signal analyzer",
  "Compatibility linter",
];

function content(tool: string, props: IToolsPanel) {
  switch (tool) {
    case "Snippets":
      return <Snippets {...props} />;
    case "Tap rhythm":
      return <TapRhythm {...props} />;
    case "Voice sketch":
      return <VoiceSketch {...props} />;
    case "Time warp":
      return <TimeWarp {...props} />;
    case "Audio trim":
      return (
        <div className="panel-content">
          <p>
            Choose a clip, set its in and out points, and generate haptics from the selected range.
          </p>
          <button onClick={props.onOpenAudioTrim}>Open audio trim</button>
        </div>
      );
    case "Signal analyzer":
      return <SignalAnalyzer pattern={props.pattern} />;
    case "Compatibility linter":
      return <CompatibilityLinter pattern={props.pattern} />;
    default:
      return (
        <Library
          onPreview={(pattern) => {
            if (props.onPreview) props.onPreview(pattern);
            else props.onError("Preview is unavailable");
          }}
          onAdd={props.onAdd}
        />
      );
  }
}

export function ToolsPanel(props: IToolsPanel) {
  const [tool, setTool] = useState("Pulsar library");
  return (
    <section className="panel-content">
      <label>
        Tool
        <select
          aria-label="Studio tool"
          value={tool}
          onChange={(event) => setTool(event.target.value)}
        >
          {TOOLS.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <h3>{tool}</h3>
      {content(tool, props)}
    </section>
  );
}
