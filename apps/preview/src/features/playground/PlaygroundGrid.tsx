import Svg, { G, Line, Rect } from "react-native-svg";
import { colors } from "../../theme/colors";

const horizontal = [58.111, 116.222, 174.333, 232.444, 290.556, 348.667, 406.778, 464.889];
const vertical = [57.167, 114.333, 171.5, 228.667, 285.833];

export function PlaygroundGrid() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 343 523" preserveAspectRatio="xMidYMid slice">
      <Rect width={343} height={523} rx={4} fill={colors.chip} />
      <G stroke={colors.grid} strokeWidth={2.46114}>
        {horizontal.map((value) => (
          <Line key={value} x1={0} x2={343} y1={value} y2={value} />
        ))}
        {vertical.map((value) => (
          <Line key={value} x1={value} x2={value} y1={0} y2={523} />
        ))}
      </G>
    </Svg>
  );
}
