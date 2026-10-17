import { Appear, Card, Pill, Scene } from "../components/Layout";
import { Line } from "../components/Diagram";
import { C } from "../theme/tokens";

export function LibraryScene() {
  return (
    <Scene kicker="Library" title="Audition first. Append when it fits.">
      <Appear delay={8}>
        <Card x={120} y={300} w={460} h={525}>
          <b style={{ fontSize: 32 }}>Library</b>
          <div style={{ fontSize: 22, color: C.muted, marginTop: 24 }}>
            ⌕ Search · Tags · Collections
          </div>
          {["Thud", "Tick", "Celebrate"].map((name, i) => (
            <div
              key={name}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                padding: "22px 14px",
                marginTop: 18,
                border: `1px solid ${i === 0 ? C.accent : C.line}`,
                borderRadius: 8,
              }}
            >
              <b style={{ fontSize: 25, flex: 1 }}>{name}</b>
              <span style={{ color: C.accent, fontSize: 21 }}>About</span>
              <span style={{ color: C.accent, fontSize: 28 }}>+</span>
            </div>
          ))}
        </Card>
      </Appear>
      <Line x1={580} y1={550} x2={680} y2={550} delay={24} />
      <Appear delay={30}>
        <Card x={680} y={300} w={650} h={525}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b style={{ fontSize: 34 }}>Thud</b>
            <span style={{ fontSize: 24, color: C.muted }}>×</span>
          </div>
          <svg viewBox="0 0 550 150" style={{ width: "100%", height: 170, marginTop: 35 }}>
            <path
              d="M0,145 L0,20 L35,5 L110,120 L230,140 L550,148"
              fill="none"
              stroke={C.accent}
              strokeWidth="5"
            />
            <line x1="0" x2="550" y1="150" y2="150" stroke={C.line} />
          </svg>
          <div style={{ marginTop: 16 }}>
            <Pill>▶ Play / Stop</Pill>
          </div>
          <div style={{ color: C.fg2, fontSize: 25, marginTop: 28 }}>
            A short impact with a soft tail.
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <Pill color={C.freq}>Impact</Pill>
            <Pill color={C.ok}>Add to preset</Pill>
          </div>
        </Card>
      </Appear>
      <Appear delay={65}>
        <Card x={1400} y={300} w={400} h={525} style={{ background: C.sunken }}>
          <b style={{ fontSize: 29 }}>Separate audition</b>
          <div style={{ fontSize: 25, lineHeight: 1.65, color: C.fg2, marginTop: 28 }}>
            Play through speakers.
            <br />
            Pair a phone to feel it.
            <br />
            <br />
            Your project pattern stays as it is.
          </div>
          <div style={{ fontSize: 24, color: C.accent, marginTop: 28 }}>+ or drag to append</div>
        </Card>
      </Appear>
      <Appear
        delay={90}
        style={{ position: "absolute", left: 120, top: 930, color: C.fg2, fontSize: 25 }}
      >
        About opens details and its own preview. Adding is a separate action on the current pattern.
      </Appear>
    </Scene>
  );
}
