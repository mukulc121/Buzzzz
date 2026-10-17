import { C, MONO } from "../theme/tokens";
import { Appear, Pill, Scene } from "../components/Layout";
import { useIn } from "../hooks/useIn";

export function OutroScene() {
  const p = useIn(10);
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
          gap: 36,
        }}
      >
        <Appear>
          <div style={{ fontSize: 40, color: C.fg2 }}>Start Studio, relay and Metro together</div>
        </Appear>
        <div
          style={{
            opacity: p,
            transform: `scale(${0.96 + 0.04 * p})`,
            fontFamily: MONO,
            fontSize: 72,
            fontWeight: 700,
            padding: "28px 56px",
            borderRadius: 28,
            background: "rgba(10, 27, 46, 1)",
            color: "rgba(255, 255, 255, 1)",
          }}
        >
          bun run dev
        </div>
        <Appear delay={24}>
          <div style={{ display: "flex", gap: 20 }}>
            <Pill>Studio · localhost:5173</Pill>
            <Pill color={C.freq}>Metro · :8082</Pill>
            <Pill color={C.ok}>Preview build · scan the QR</Pill>
          </div>
        </Appear>
      </div>
    </Scene>
  );
}
