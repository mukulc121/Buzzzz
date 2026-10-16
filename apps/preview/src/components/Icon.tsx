import {
  ArrowRight,
  Brush,
  Check,
  Circle,
  Download,
  Heart,
  House,
  Info,
  LayoutList,
  Loader,
  Pause,
  Play,
  QrCode,
  RefreshCw,
  SlidersVertical,
  Sparkles,
  Square,
  X,
} from "lucide-react-native";

// Lucide equivalents of the original's icon font glyphs.
const glyphs = {
  arrow: ArrowRight,
  brush: Brush,
  check: Check,
  download: Download,
  heart: Heart,
  "heart-fill": Heart,
  home: House,
  info: Info,
  list: LayoutList,
  loader: Loader,
  play: Play,
  "qr-code": QrCode,
  record: Circle,
  "refresh-cw": RefreshCw,
  sliders: SlidersVertical,
  sparkles: Sparkles,
  square: Square,
  stop: Pause,
  x: X,
};
export type IconName = keyof typeof glyphs;
interface IIcon {
  name: IconName;
  size: number;
  color: string;
}
export function Icon(props: IIcon) {
  const { name, size, color } = props;
  const Glyph = glyphs[name];
  const filled = name === "heart-fill" || name === "record";
  return (
    <Glyph
      accessibilityLabel={name}
      size={size}
      color={color}
      fill={filled ? color : "none"}
      strokeWidth={name === "record" ? 0 : 2}
    />
  );
}
