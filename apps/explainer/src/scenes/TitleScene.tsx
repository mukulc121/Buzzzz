import { useCurrentFrame } from "remotion";
import { C } from "../theme/tokens";
import { Appear, Scene } from "../components/Layout";

export function TitleScene() {
  const frame = useCurrentFrame();
  const pulse = (d: number) =>
    1 + 0.5 * Math.max(0, Math.sin(((frame - d) / 30) * Math.PI)) * (frame > d ? 1 : 0);
  return (
    <Scene kicker="" title="">
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <Appear>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 32,
              background: C.accent,
              display: "grid",
              placeItems: "center",
              transform: `scale(${0.95 + 0.05 * pulse(20)})`,
            }}
          >
            <svg width="62" height="62" viewBox="0 0 16 16">
              <path
                d="M9.2 1.5 3.5 9h3.8l-.9 5.5L12.5 7H8.6l.6-5.5Z"
                fill="rgba(255, 255, 255, 1)"
              />
            </svg>
          </div>
        </Appear>
        <Appear delay={8}>
          <div style={{ fontSize: 132, fontWeight: 750, letterSpacing: -2.5 }}>Buzzzz</div>
        </Appear>
        <Appear delay={16}>
          <div style={{ fontSize: 36, color: C.fg2 }}>
            Compose in the browser. Preview on your phone. Build with Pulsar.
          </div>
        </Appear>
      </div>
    </Scene>
  );
}
