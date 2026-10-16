import { interpolate, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme/tokens";
import { Appear, Card, Code, Pill, Scene } from "../components/Layout";

const W = 980;
const H = 420;
const amp = [
  [0, 0.85],
  [90, 0.95],
  [260, 0.35],
  [520, 0.6],
  [760, 0.1],
  [1000, 0],
];
const freq = [
  [0, 0.3],
  [400, 0.7],
  [1000, 0.2],
];
const taps = [
  [0, 1],
  [260, 0.7],
  [520, 0.85],
];
const px = (t: number) => (t / 1000) * W;
const py = (v: number) => H - v * H;
const path = (pts: number[][]) =>
  pts.map(([t, v], i) => `${i ? "L" : "M"}${px(t)},${py(v)}`).join(" ");

export function PatternScene() {
  const frame = useCurrentFrame();
  const draw = (start: number) =>
    interpolate(frame, [start, start + 50], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const tapIn = (i: number) =>
    interpolate(frame, [80 + i * 10, 96 + i * 10], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const json = `{
  "discretePattern": [
    { "time": 0,
      "amplitude": 1,
      "frequency": 0.6 }, …
  ],
  "continuousPattern": {
    "amplitude": [
      { "time": 0, "value": 0.85 }, …
    ],
    "frequency": [
      { "time": 0, "value": 0.3 }, …
    ]
  }
}`;
  const chars = Math.floor(
    interpolate(frame, [110, 190], [0, json.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return (
    <Scene kicker="1 · Design" title="A pattern is three layers over time">
      <Card x={120} y={270} w={1060} h={600}>
        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          <Pill color={C.amp}>Intensity</Pill>
          <Pill color={C.freq}>Frequency</Pill>
          <Pill color={C.tap}>Taps</Pill>
        </div>
        <svg width={W} height={H} style={{ overflow: "visible" }}>
          {[0, 0.5, 1].map((v) => (
            <line key={v} x1={0} x2={W} y1={py(v)} y2={py(v)} stroke={C.line} strokeWidth={2} />
          ))}
          <path
            d={`${path(amp)} L${W},${H} L0,${H} Z`}
            fill={C.amp}
            fillOpacity={0.1 * (1 - draw(10))}
          />
          <path
            d={path(amp)}
            fill="none"
            stroke={C.amp}
            strokeWidth={5}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={draw(10)}
            strokeLinejoin="round"
          />
          <path
            d={path(freq)}
            fill="none"
            stroke={C.freq}
            strokeWidth={4}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={draw(40)}
          />
          {taps.map(([t, v], i) => (
            <g key={t} opacity={tapIn(i)}>
              <line
                x1={px(t)}
                x2={px(t)}
                y1={H}
                y2={py(v * tapIn(i))}
                stroke={C.tap}
                strokeWidth={7}
                strokeLinecap="round"
              />
              <circle
                cx={px(t)}
                cy={py(v * tapIn(i))}
                r={10}
                fill={C.tap}
                stroke="rgba(255, 255, 255, 1)"
                strokeWidth={3}
              />
            </g>
          ))}
        </svg>
      </Card>
      <Appear delay={100}>
        <Card
          x={1230}
          y={270}
          w={570}
          h={600}
          style={{ background: "rgba(10, 27, 46, 1)", borderColor: "rgba(10, 27, 46, 1)" }}
        >
          <div
            style={{
              fontSize: 20,
              color: "rgba(130, 177, 201, 1)",
              marginBottom: 16,
              fontFamily: FONT,
            }}
          >
            Pulsar device format · validated by core
          </div>
          <Code style={{ color: "rgba(227, 246, 255, 1)", fontSize: 19 }}>
            {json.slice(0, chars)}
          </Code>
        </Card>
      </Appear>
      <Appear delay={150} style={{ position: "absolute", left: 120, top: 920 }}>
        <div style={{ fontSize: 26, color: C.fg2 }}>
          Start from scratch or from 206 Pulsar presets in the library. Values 0–1, time in ms.
        </div>
      </Appear>
    </Scene>
  );
}
