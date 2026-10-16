// Same palette as the studio.
export const light = {
  bg: "rgba(225, 243, 250, 1)",
  panel: "rgba(255, 255, 255, 1)",
  sunken: "rgba(238, 248, 252, 1)",
  line: "rgba(181, 225, 241, 1)",
  fg: "rgba(0, 26, 114, 1)",
  fg2: "rgba(43, 100, 148, 1)",
  muted: "rgba(74, 112, 148, 1)",
  accent: "rgba(0, 112, 160, 1)",
  accentFg: "rgba(255, 255, 255, 1)",
  ok: "rgba(24, 131, 95, 1)",
  err: "rgba(186, 65, 43, 1)",
};
export const dark: typeof light = {
  bg: "rgba(10, 27, 46, 1)",
  panel: "rgba(16, 39, 62, 1)",
  sunken: "rgba(12, 32, 53, 1)",
  line: "rgba(37, 76, 103, 1)",
  fg: "rgba(227, 246, 255, 1)",
  fg2: "rgba(163, 208, 230, 1)",
  muted: "rgba(130, 177, 201, 1)",
  accent: "rgba(56, 172, 221, 1)",
  accentFg: "rgba(4, 24, 42, 1)",
  ok: "rgba(100, 216, 174, 1)",
  err: "rgba(255, 156, 132, 1)",
};
export type Theme = typeof light;
