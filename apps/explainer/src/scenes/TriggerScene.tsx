import { C, MONO } from "../theme/tokens";
import { Appear, Card, Scene } from "../components/Layout";
import { Line } from "../components/Diagram";

const TRIG = [
  { name: "impact", pattern: "Thud", color: C.amp },
  { name: "snap", pattern: "Tick", color: C.tap },
  { name: "success", pattern: "Celebrate", color: C.ok },
];
export function TriggerScene() {
  return (
    <Scene kicker="2 · Map" title="Rive triggers become haptic slots">
      <Appear delay={6}>
        <Card x={120} y={330} w={420} h={420}>
          <div style={{ fontSize: 22, color: C.muted }}>card.riv</div>
          <div style={{ fontSize: 34, fontWeight: 700, marginTop: 6 }}>State machine</div>
          <div style={{ marginTop: 30, fontSize: 24, color: C.fg2, lineHeight: 1.5 }}>
            In the Rive editor, add <b>Trigger</b> properties to the view model and fire them from
            the timeline or listeners.
          </div>
        </Card>
      </Appear>
      <Line x1={540} y1={540} x2={660} y2={540} delay={20} />
      <Appear delay={24}>
        <Card x={660} y={330} w={420} h={420}>
          <div style={{ fontSize: 22, color: C.muted }}>View model</div>
          <div style={{ fontSize: 34, fontWeight: 700, marginTop: 6 }}>Triggers</div>
          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 18 }}>
            {TRIG.map((t, i) => (
              <Appear key={t.name} delay={34 + i * 8}>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 600,
                    padding: "10px 16px",
                    background: C.sunken,
                    borderRadius: 12,
                  }}
                >
                  {t.name}
                </div>
              </Appear>
            ))}
          </div>
        </Card>
      </Appear>
      {TRIG.map((t, i) => (
        <Line
          key={t.name}
          x1={1080}
          y1={470 + i * 78}
          x2={1300}
          y2={430 + i * 130}
          delay={70 + i * 12}
          dashed
        />
      ))}
      {TRIG.map((t, i) => (
        <Appear
          key={t.name}
          delay={78 + i * 12}
          style={{ position: "absolute", left: 1300, top: 390 + i * 130 }}
        >
          <Card
            x={0}
            y={0}
            w={480}
            style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: 18 }}
          >
            <svg width="90" height="40">
              <path
                d="M0,40 L0,8 L20,4 L40,26 L70,32 L90,40 Z"
                fill={t.color}
                fillOpacity={0.18}
                stroke={t.color}
                strokeWidth={2.5}
              />
            </svg>
            <div style={{ fontSize: 30, fontWeight: 650 }}>{t.pattern}</div>
          </Card>
        </Appear>
      ))}
      <Appear delay={120} style={{ position: "absolute", left: 120, top: 860 }}>
        <div style={{ fontSize: 26, color: C.fg2, maxWidth: 1600 }}>
          Import a .riv, discover its view-model triggers, then map each trigger to a project
          pattern.
        </div>
      </Appear>
    </Scene>
  );
}
