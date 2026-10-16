import Svg, { Ellipse, Line, Path } from "react-native-svg";
import { demoColors } from "../shared/demoStyles";

const RAYS = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);

interface IBalloonArt {
  popped: boolean;
  string: string;
}
export function BalloonArt(props: IBalloonArt) {
  const { popped, string } = props;
  if (popped) {
    return (
      <Svg width={160} height={220} viewBox="0 0 160 220">
        {RAYS.map((a) => (
          <Line
            key={a}
            x1={80 + Math.cos(a) * 30}
            y1={90 + Math.sin(a) * 30}
            x2={80 + Math.cos(a) * 62}
            y2={90 + Math.sin(a) * 62}
            stroke={demoColors.cyan}
            strokeWidth={5}
            strokeLinecap="round"
          />
        ))}
      </Svg>
    );
  }
  return (
    <Svg width={160} height={220} viewBox="0 0 160 220">
      <Path d="M80 172 C 68 188, 92 200, 80 218" stroke={string} strokeWidth={2} fill="none" />
      <Path d="M72 162 L88 162 L80 174 Z" fill={demoColors.cyan} />
      <Ellipse cx={80} cy={88} rx={62} ry={76} fill={demoColors.cyan} />
      <Ellipse cx={58} cy={58} rx={12} ry={20} fill="rgba(255, 255, 255, 0.4)" />
    </Svg>
  );
}
