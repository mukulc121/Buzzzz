import { expect, test, type Locator } from "@playwright/test";

const harness = `
import * as ReactModule from "/node_modules/.vite/deps/react.js";
import * as DOMModule from "/node_modules/.vite/deps/react-dom_client.js";
import { AnimationFilmstrip } from "/src/features/composer/AnimationFilmstrip.tsx";
const React = ReactModule.default ?? ReactModule;
const { createRoot } = DOMModule.default ?? DOMModule;
const value = (k) => ({ a: 0, k });
const data = { v: "5.7.4", fr: 30, ip: 0, op: 60, w: 200, h: 100, assets: [], layers: [{ ddd: 0, ind: 1, ty: 4, nm: "Circle", sr: 1, ks: { o: value(100), r: value(0), p: value([100,50,0]), a: value([0,0,0]), s: value([100,100,100]) }, ip: 0, op: 60, st: 0, bm: 0, shapes: [{ ty: "el", p: value([0,0]), s: value([40,40]), nm: "Circle" }, { ty: "fl", c: value([0,1,0,1]), o: value(100), r: 1, bm: 0, nm: "Fill" }] }] };
const document = { data, frameRate: 30, inFrame: 0, durationMs: 2000, width: 200, height: 100, nodes: [], warnings: [] };
function Harness() {
  const [start, setStart] = React.useState(0);
  return React.createElement("div", null,
    React.createElement("button", { onClick: () => setStart(500) }, "Pan filmstrip"),
    React.createElement("div", { style: { width: 400, height: 40 } }, React.createElement(AnimationFilmstrip, { document, end: 2000, start }))
  );
}
const container = window.document.createElement("div");
window.document.getElementById("root").style.display = "none";
window.document.body.append(container);
createRoot(container).render(React.createElement(Harness));
`;

async function circleBounds(canvas: Locator) {
  return canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("Missing filmstrip canvas");
    const pixels = element.getContext("2d")?.getImageData(0, 0, 80, 40).data;
    if (!pixels) throw new Error("Missing filmstrip pixels");
    let left = 80;
    let right = -1;
    let top = 40;
    let bottom = -1;
    for (let y = 0; y < 40; y++)
      for (let x = 0; x < 80; x++) {
        const index = (y * 80 + x) * 4;
        if (pixels[index + 1] > 200 && pixels[index] < 40 && pixels[index + 3] > 128) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    return { left, top, width: right - left + 1, height: bottom - top + 1 };
  });
}

test("nonsquare animation thumbnails preserve circles and remain anchored while panning", async ({
  page,
}) => {
  const entry = await (await page.request.get("/src/main.tsx")).text();
  const react = entry.match(/from "([^"]*\/react\.js\?[^"]*)"/)?.[1];
  const dom = entry.match(/from "([^"]*\/react-dom_client\.js\?[^"]*)"/)?.[1];
  if (!react || !dom) throw new Error("Missing Vite React modules");
  await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: harness
        .replace("/node_modules/.vite/deps/react.js", react)
        .replace("/node_modules/.vite/deps/react-dom_client.js", dom),
    }),
  );
  await page.goto("/");
  await page.addStyleTag({
    content: ".timeline-filmstrip { display: block; width: 100%; height: 100%; }",
  });
  const canvas = page.getByRole("img", { name: "Animation frames", exact: true });
  await expect.poll(async () => (await circleBounds(canvas)).left).toBe(32);
  const initial = await circleBounds(canvas);
  expect(initial.width).toBe(16);
  expect(initial.height).toBe(16);
  await page.getByRole("button", { name: "Pan filmstrip", exact: true }).click();
  await expect.poll(async () => (await circleBounds(canvas)).left).toBe(12);
  const panned = await circleBounds(canvas);
  expect(panned.width).toBe(16);
  expect(panned.height).toBe(16);
});
