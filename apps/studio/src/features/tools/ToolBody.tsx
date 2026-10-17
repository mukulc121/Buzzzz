import { LazyLibrary as Library } from "../presets/LazyLibrary";
import { AudioTrimControls } from "../audio/AudioTrimControls";
import { CompatibilityLinter } from "./CompatibilityLinter";
import { SignalAnalyzer } from "./SignalAnalyzer";
import { Snippets } from "./Snippets";
import { TapRhythm } from "./TapRhythm";
import { TimeWarp } from "./TimeWarp";
import { VoiceSketch } from "./VoiceSketch";
import type { IToolSession, ToolId } from "./model";

interface IToolBody {
  tool: ToolId;
  session: IToolSession;
}

export function ToolBody(props: IToolBody) {
  const { tool, session } = props;
  switch (tool) {
    case "pulsar-library":
      return (
        <Library
          durationMs={session.durationMs}
          onAppend={session.onAppend}
          onPreview={session.onPreview}
          onStopPreview={session.onStopPreview}
          previewing={session.previewing}
          canEdit={session.canEdit}
        />
      );
    case "snippets":
      return <Snippets {...session} />;
    case "tap-rhythm":
      return <TapRhythm {...session} />;
    case "voice-sketch":
      return <VoiceSketch {...session} />;
    case "time-warp":
      return <TimeWarp {...session} />;
    case "audio-trim":
      return session.audio.source ? (
        <AudioTrimControls audio={session.audio} onClose={session.audio.stopPreview} />
      ) : (
        <div className="tool-empty">
          <h3>No audio attached</h3>
          <p>Attach an audio track to the pattern to trim it.</p>
        </div>
      );
    case "signal-analyzer":
      return <SignalAnalyzer pattern={session.pattern} />;
    case "compatibility-linter":
      return <CompatibilityLinter pattern={session.pattern} />;
  }
}
