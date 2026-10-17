import Svg, { Path, Rect, type SvgProps } from "react-native-svg";

interface IBuzzzzMark {
  size?: number;
  style?: SvgProps["style"];
}

export function BuzzzzMark(props: IBuzzzzMark) {
  const { size = 50, style } = props;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={style}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Buzzzz"
    >
      <Rect width="64" height="64" rx="12" fill="rgba(0, 26, 114, 1)" />
      <Path d="M36 8 16 35h14l-3 21 21-29H34Z" fill="rgba(255, 255, 255, 1)" />
      <Path
        d="M8 26v12m48-12v12"
        stroke="rgba(56, 172, 221, 1)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </Svg>
  );
}
