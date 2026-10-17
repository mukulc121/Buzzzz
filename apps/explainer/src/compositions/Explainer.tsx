import { AbsoluteFill, Html5Audio, Sequence, staticFile } from "remotion";
import { C } from "../theme/tokens";
import { LEAD, TIMELINE } from "./timing";

export function Explainer() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {TIMELINE.map(({ Component, duration, from }, i) => (
        <Sequence key={i} from={from} durationInFrames={duration}>
          <Component />
          <Sequence from={LEAD}>
            <Html5Audio src={staticFile(`vo/s${i}.wav`)} />
          </Sequence>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
