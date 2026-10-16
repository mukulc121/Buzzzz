import { useId, useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import type { Pattern } from "@buzzzz/core";
import { colors } from "../../theme/colors";
import { patternCanvasGeometry } from "./canvasGeometry";
import { libraryStyles as styles } from "./libraryStyles";

interface IPatternCanvas {
  pattern: Pattern;
  durationMs: number;
  progress: number;
}

export function PatternCanvas(props: IPatternCanvas) {
  const { pattern, durationMs, progress } = props;
  const [size, setSize] = useState({ width: 0, height: 120 });
  const id = `pulsar-freq-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const geometry = useMemo(
    () => patternCanvasGeometry(pattern, durationMs, size.width, size.height),
    [pattern, durationMs, size],
  );
  const played = size.width * Math.max(0, Math.min(1, progress));
  const gradient = geometry.gradient.length > 1;
  const fill = gradient ? `url(#${id})` : (geometry.gradient[0]?.color ?? colors.tag);
  const stroke = gradient ? `url(#${id})` : (geometry.gradient[0]?.color ?? colors.border);
  const shapes = (
    <>
      {geometry.area && <Path d={geometry.area} fill={fill} opacity={0.45} />}
      {geometry.line && <Path d={geometry.line} stroke={stroke} strokeWidth={2} fill="none" />}
      {geometry.impulses.map((point, index) => (
        <Line
          key={index}
          x1={point.x}
          x2={point.x}
          y1={geometry.baseline}
          y2={point.y}
          stroke={point.color}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      ))}
    </>
  );
  return (
    <View style={styles.canvas}>
      <View style={styles.plot} onLayout={(event) => setSize(event.nativeEvent.layout)}>
        {size.width > 0 && (
          <Svg
            width={size.width}
            height={size.height}
            accessibilityRole="image"
            accessibilityLabel="Pattern waveform"
          >
            <Defs>
              {gradient && (
                <LinearGradient
                  id={id}
                  gradientUnits="userSpaceOnUse"
                  x1={3}
                  y1={0}
                  x2={size.width - 3}
                  y2={0}
                >
                  {geometry.gradient.map((stop, index) => (
                    <Stop key={index} offset={stop.offset} stopColor={stop.color} />
                  ))}
                </LinearGradient>
              )}
              <ClipPath id={`${id}-played`}>
                <Rect x={0} y={0} width={played} height={size.height} />
              </ClipPath>
            </Defs>
            <Line
              x1={0}
              y1={geometry.baseline}
              x2={size.width}
              y2={geometry.baseline}
              stroke={colors.tag}
              strokeWidth={1}
            />
            <G opacity={0.3}>{shapes}</G>
            <G clipPath={`url(#${id}-played)`}>{shapes}</G>
            {played > 0 && (
              <Line
                x1={played}
                y1={0}
                x2={played}
                y2={size.height}
                stroke={colors.navy}
                strokeWidth={1.5}
              />
            )}
          </Svg>
        )}
      </View>
    </View>
  );
}
