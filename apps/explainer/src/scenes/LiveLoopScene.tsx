import { interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "../theme/tokens";
import { Card, Scene } from "../components/Layout";
import { Line, Packet } from "../components/Diagram";

const SX = 330,
  RX = 960,
  PX = 1590,
  NY = 470;
// Paced to the narration: all beats scaled by K.
const K = 1.45;
const STEPS = [
  { at: 0, text: 'Press "Play with haptics" in the Studio' },
  { at: 40 * K, text: "Relay forwards restart to every paired phone" },
  { at: 90 * K, text: "Phone replays the Rive animation from frame 0" },
  { at: 150 * K, text: "Trigger fires → Pulsar plays the mapped pattern" },
  { at: 210 * K, text: 'Phone reports "fired" → Studio row lights up' },
];
export function LiveLoopScene() {
  const frame = useCurrentFrame() / K;
  const ballY = frame < 90 ? 0 : Math.abs(Math.sin(((frame - 90) / 60) * Math.PI)) * -110;
  const hit = frame >= 150 && frame < 175;
  const shake = hit ? Math.sin(frame * 2.2) * 7 : 0;
  const ring = interpolate(frame, [150, 185], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const studioFlash = interpolate(frame, [250, 262, 300], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pressed = frame >= 6 && frame < 14;
  return (
    <Scene kicker="Preview flow" title="One press, end to end">
      {/* Studio */}
      <Card x={SX - 210} y={NY - 140} w={420} h={280}>
        <div style={{ fontSize: 30, fontWeight: 700 }}>Studio</div>
        <div
          style={{
            marginTop: 22,
            display: "inline-flex",
            padding: "14px 24px",
            borderRadius: 14,
            background: C.accent,
            color: "rgba(255, 255, 255, 1)",
            fontSize: 24,
            fontWeight: 700,
            transform: `scale(${pressed ? 0.96 : 1})`,
          }}
        >
          ▶ Play with haptics
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: MONO,
            fontSize: 22,
            padding: "8px 12px",
            borderRadius: 10,
            background: `rgba(0, 112, 160, ${0.2 * studioFlash})`,
          }}
        >
          impact → Thud
        </div>
      </Card>
      {/* Relay */}
      <Card
        x={RX - 170}
        y={NY - 90}
        w={340}
        h={180}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700 }}>Relay</div>
        <div style={{ fontFamily: MONO, fontSize: 20, color: C.muted, marginTop: 6 }}>
          Local or Cloudflare room
        </div>
      </Card>
      {/* Phone */}
      <div
        style={{
          position: "absolute",
          left: PX - 150,
          top: NY - 270,
          width: 300,
          height: 560,
          borderRadius: 52,
          background: "rgba(10, 27, 46, 1)",
          padding: 14,
          boxSizing: "border-box",
          transform: `translateX(${shake}px)`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 40,
            background: C.panel,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 120,
              height: 3,
              background: C.line,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 110,
              bottom: 123,
              width: 52,
              height: 52,
              borderRadius: 26,
              background: C.accent,
              transform: `translateY(${ballY}px)`,
            }}
          />
          {hit && (
            <div
              style={{
                position: "absolute",
                left: 136 - 60 * ring,
                bottom: 123 - 30 * ring,
                width: 120 * ring,
                height: 60 * ring,
                borderRadius: "50%",
                border: `3px solid ${C.tap}`,
                opacity: 1 - ring,
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              bottom: 34,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 20,
              fontWeight: 600,
              color: C.fg2,
            }}
          >
            {frame >= 150 ? "▸ impact" : "Preview app"}
          </div>
        </div>
      </div>
      <Line x1={SX + 210} y1={NY} x2={RX - 170} y2={NY} />
      <Line x1={RX + 170} y1={NY} x2={PX - 150} y2={NY} />
      <Packet
        x1={SX + 210}
        y1={NY}
        x2={RX - 170}
        y2={NY}
        from={14 * K}
        to={40 * K}
        label="restart"
      />
      <Packet
        x1={RX + 170}
        y1={NY}
        x2={PX - 150}
        y2={NY}
        from={44 * K}
        to={80 * K}
        label="restart"
      />
      <Packet
        x1={PX - 150}
        y1={NY}
        x2={RX + 170}
        y2={NY}
        from={190 * K}
        to={220 * K}
        color={C.ok}
        label="fired: impact"
      />
      <Packet
        x1={RX - 170}
        y1={NY}
        x2={SX + 210}
        y2={NY}
        from={222 * K}
        to={250 * K}
        color={C.ok}
        label="fired: impact"
      />
      {/* Step list */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 800,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 18,
          width: 1680,
        }}
      >
        {STEPS.map((s, i) => {
          const on = frame * K >= s.at;
          const current = on && (i === STEPS.length - 1 || frame * K < STEPS[i + 1].at);
          return (
            <div
              key={i}
              style={{
                padding: 18,
                borderRadius: 16,
                background: current ? C.panel : "rgba(0, 0, 0, 0)",
                border: `1.5px solid ${current ? C.accent : C.line}`,
                opacity: on ? 1 : 0.35,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: current ? C.accent : C.muted }}>
                STEP {i + 1}
              </div>
              <div style={{ fontSize: 22, color: C.fg2, marginTop: 6, lineHeight: 1.35 }}>
                {s.text}
              </div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
}
