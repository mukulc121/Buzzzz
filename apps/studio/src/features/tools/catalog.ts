import type { ComponentProps } from "react";
import type { ToolIcon } from "../../components/ToolIcon";
import type { ToolId } from "./model";

interface ITool {
  id: ToolId;
  name: string;
  category: string;
  description: string;
  icon: ComponentProps<typeof ToolIcon>["name"];
}

export const TOOLS: readonly ITool[] = [
  {
    id: "pulsar-library",
    name: "Pulsar Library",
    category: "Generate",
    description: "The 151 ready-to-use patterns that ship with the Pulsar SDK.",
    icon: "library",
  },
  {
    id: "snippets",
    name: "Snippets",
    category: "Generate",
    description: "Your saved pieces - reuse a whole pattern or part of one across projects.",
    icon: "bookmark",
  },
  {
    id: "tap-rhythm",
    name: "Tap Rhythm",
    category: "Generate",
    description: "Tap a beat on the mouse, touchpad or keyboard to lay down discrete events.",
    icon: "drum",
  },
  {
    id: "voice-sketch",
    name: "Voice Sketch",
    category: "Generate",
    description: "Hum or buzz into the mic and feel it back as intensity and frequency.",
    icon: "mic",
  },
  {
    id: "time-warp",
    name: "Time Warp",
    category: "Transform",
    description: "Stretch, quantize or reverse the whole pattern on the time axis.",
    icon: "timer",
  },
  {
    id: "audio-trim",
    name: "Audio Trim",
    category: "Audio",
    description: "Choose which stretch of the attached track the timeline uses.",
    icon: "scissors",
  },
  {
    id: "signal-analyzer",
    name: "Signal Analyzer",
    category: "Analyze",
    description: "Duty cycle, peaks, energy and event density for the open pattern.",
    icon: "gauge",
  },
  {
    id: "compatibility-linter",
    name: "Compatibility Linter",
    category: "Analyze",
    description: "Flag what a phone at a given haptics tier will not reproduce.",
    icon: "shield",
  },
];
