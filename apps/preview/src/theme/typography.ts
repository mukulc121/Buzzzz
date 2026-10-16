import type { TextStyle } from "react-native";

// The original asks for an unbundled "DMSans", so both platforms fall back to the system font.
export const font = {
  regular: { fontWeight: "400" },
  medium: { fontWeight: "500" },
  semibold: { fontWeight: "600" },
  bold: { fontWeight: "700" },
} satisfies Record<string, TextStyle>;
