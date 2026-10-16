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
  highlight: "rgba(52, 173, 217, 1)",
  ok: "rgba(24, 131, 95, 1)",
  err: "rgba(186, 65, 43, 1)",
};
export const dark: typeof light = {
  bg: "rgba(11, 17, 32, 1)",
  panel: "rgba(20, 29, 51, 1)",
  sunken: "rgba(15, 34, 49, 1)",
  line: "rgba(39, 53, 79, 1)",
  fg: "rgba(219, 228, 255, 1)",
  fg2: "rgba(154, 166, 201, 1)",
  muted: "rgba(154, 166, 201, 1)",
  accent: "rgba(47, 91, 208, 1)",
  accentFg: "rgba(255, 255, 255, 1)",
  highlight: "rgba(63, 177, 230, 1)",
  ok: "rgba(100, 216, 174, 1)",
  err: "rgba(255, 156, 132, 1)",
};
export type Theme = typeof light;
