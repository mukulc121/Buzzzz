import { expect, test, type Page } from "@playwright/test";
import type { Pattern } from "@buzzzz/core";

const initial: Pattern = {
  discretePattern: [{ time: 700, amplitude: 0.8, frequency: 0.35 }],
  continuousPattern: {
    amplitude: [
      { time: 200, value: 0.3 },
      { time: 400, value: 0.6 },
    ],
    frequency: [{ time: 600, value: 0.4 }],
  },
};

async function mount(page: Page, snapMs = 25) {
  await page.setViewportSize({ width: 1100, height: 700 });
  const entry = await (await page.request.get("/src/main.tsx")).text();
  const react = entry.match(/from "([^"]*\/react\.js\?[^"]*)"/)?.[1];
  const dom = entry.match(/from "([^"]*\/react-dom_client\.js\?[^"]*)"/)?.[1];
  if (!react || !dom) throw new Error("Missing Vite React modules");
  await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
      import * as ReactModule from ${JSON.stringify(react)};
      import * as DOMModule from ${JSON.stringify(dom)};
      import { Chart } from "/src/features/composer/Chart.tsx";
      const React = ReactModule.default ?? ReactModule;
      const { createRoot } = DOMModule.default ?? DOMModule;
      function Harness() {
        const [pattern, setPattern] = React.useState(${JSON.stringify(initial)});
        const [selection, setSelection] = React.useState([]);
        const [selected, setSelected] = React.useState(null);
        const [begins, setBegins] = React.useState(0);
        return React.createElement("div", null,
          React.createElement(Chart, { pattern, layer: "amplitude", viewMs: 1000,
            playhead: null, selected, onSelect: setSelected, selection,
            onSelectionChange: setSelection, snapMs: ${snapMs},
            onBegin: () => setBegins(n => n + 1), onChange: setPattern }),
          React.createElement("output", { id: "axis-state" }, JSON.stringify({pattern,selection,begins})));
      }
      createRoot(document.getElementById("root")).render(React.createElement(Harness));
    `,
    }),
  );
  await page.goto("/");
  for (const file of ["tokens", "composer", "chart-details"])
    await page.addStyleTag({ path: `apps/studio/src/styles/${file}.css` });
  await page.addStyleTag({
    content: "#root { padding: 20px; } .chart { width: 800px; height: 320px; display: block; }",
  });
  await expect(page.locator("#axis-state")).toBeVisible();
  return page.getByRole("group", { name: "Haptic pattern timeline", exact: true });
}

async function expectPoint(page: Page, time: number, value: number, begins: number) {
  await expect(page.locator("#axis-state")).toHaveText(
    JSON.stringify({
      pattern: {
        ...initial,
        continuousPattern: {
          ...initial.continuousPattern,
          amplitude: [{ time, value }, initial.continuousPattern.amplitude[1]],
        },
      },
      selection: [{ layer: "amplitude", index: 0 }],
      begins,
    }),
  );
}

async function firstPoint(page: Page) {
  const point = page.getByRole("button", {
    name: "Intensity point at 200 milliseconds, 30 percent",
    exact: true,
  });
  const bounds = await point.boundingBox();
  if (!bounds) throw new Error("Missing continuous point");
  return { point, x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

test("Shift recalculates the dominant axis and releases it during the same point drag", async ({
  page,
}) => {
  await mount(page);
  const { point, x: centerX, y: centerY } = await firstPoint(page);
  const x = centerX + 3;
  const y = centerY + 3;
  await point.click();
  await page.mouse.move(x, y);
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.move(x + 70.8, y - 27.2, { steps: 6 });
  await expectPoint(page, 300, 0.3, 1);
  const crosshair = page.locator(".chart-crosshair");
  const timeRail = crosshair.locator('[data-crosshair-axis="x"]');
  const valueRail = crosshair.locator('[data-crosshair-axis="y"]');
  await expect(crosshair.locator(".chart-hover-time")).toHaveText("300 ms");
  await expect(crosshair.locator(".chart-hover-value")).toHaveText("30.0%");
  await expect(timeRail).toHaveAttribute("stroke-opacity", "0.5");
  await expect(valueRail).toHaveAttribute("stroke-opacity", "0.15");
  await expect(crosshair.locator("rect").first()).toHaveAttribute("opacity", "0.3");
  await expect(crosshair.locator(".chart-hover-value")).toHaveAttribute("opacity", "0.3");
  await page.mouse.move(x + 20, y - 54.4, { steps: 6 });
  await expectPoint(page, 200, 0.5, 1);
  await expect(crosshair.locator(".chart-hover-time")).toHaveText("200 ms");
  await expect(crosshair.locator(".chart-hover-value")).toHaveText("50.0%");
  await expect(timeRail).toHaveAttribute("stroke-opacity", "0.15");
  await expect(valueRail).toHaveAttribute("stroke-opacity", "0.5");
  await expect(crosshair.locator("rect").last()).toHaveAttribute("opacity", "0.3");
  await expect(crosshair.locator(".chart-hover-time")).toHaveAttribute("opacity", "0.3");
  await page.keyboard.up("Shift");
  await page.mouse.move(x + 70.8, y - 27.2, { steps: 6 });
  await expectPoint(page, 300, 0.4, 1);
  await expect(crosshair.locator(".chart-hover-value")).toHaveText("40.0%");
  await expect(timeRail).toHaveAttribute("stroke-opacity", "0.5");
  await expect(valueRail).toHaveAttribute("stroke-opacity", "0.5");
  await expect(crosshair.locator("rect").first()).toHaveAttribute("opacity", "1");
  await expect(crosshair.locator("rect").last()).toHaveAttribute("opacity", "1");
  await page.keyboard.down("Shift");
  await page.mouse.move(x + 71.2, y - 27.2);
  await expectPoint(page, 300, 0.3, 1);
  await page.mouse.up();
  await page.keyboard.up("Shift");
});

test("axis choice uses raw screen motion before plot clamping", async ({ page }) => {
  await mount(page);
  const { x, y } = await firstPoint(page);
  await page.mouse.move(x, y);
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.move(x + 100, y + 300, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expectPoint(page, 200, 0, 1);
});

test("point clicks single-select with modifiers and a new Shift marquee replaces selection", async ({
  page,
}) => {
  const chart = await mount(page);
  const { point } = await firstPoint(page);
  await point.click();
  await point.click({ modifiers: ["Shift"] });
  await expectPoint(page, 200, 0.3, 0);
  const second = chart.getByRole("button", {
    name: "Intensity point at 400 milliseconds, 60 percent",
    exact: true,
  });
  for (const modifier of ["Shift", "Control", "Meta"] as const) {
    await second.click({ modifiers: [modifier] });
    await expect(second).toHaveAttribute("aria-pressed", "true");
    await expect(point).toHaveAttribute("aria-pressed", "false");
    await expect(chart.locator('[aria-pressed="true"]')).toHaveCount(1);
    await point.click();
  }
  const bounds = await chart.boundingBox();
  if (!bounds) throw new Error("Missing chart");
  await page.mouse.move(bounds.x + 140, bounds.y + 50);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 580, bounds.y + 230, { steps: 6 });
  await page.mouse.up();
  await expect(chart.locator('[aria-pressed="true"]')).toHaveCount(4);
  await page.keyboard.down("Shift");
  await page.mouse.move(bounds.x + 140, bounds.y + 180);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 250, bounds.y + 230, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expectPoint(page, 200, 0.3, 0);
});

test("discrete caps and bars keep their source value-only and time-only drag modes with Shift", async ({
  page,
}) => {
  const chart = await mount(page);
  const event = chart.locator(".tap-event");
  const cap = await event.locator("circle").first().boundingBox();
  if (!cap) throw new Error("Missing frequency cap");
  await page.keyboard.down("Shift");
  await page.mouse.move(cap.x + cap.width / 2, cap.y + cap.height / 2);
  await page.mouse.down();
  await page.mouse.move(cap.x + cap.width / 2 + 100, cap.y + cap.height / 2 - 27.2, { steps: 6 });
  await page.mouse.up();
  const bar = await event.locator(".tap-bar").first().boundingBox();
  if (!bar) throw new Error("Missing discrete bar");
  await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
  await page.mouse.down();
  await page.mouse.move(bar.x + bar.width / 2 + 70.8, bar.y + bar.height / 2 - 100, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect(page.locator("#axis-state")).toHaveText(
    JSON.stringify({
      pattern: { ...initial, discretePattern: [{ time: 800, amplitude: 0.8, frequency: 0.45 }] },
      selection: [{ layer: "discrete", index: 0 }],
      begins: 2,
    }),
  );
});

test("source drag activation waits for three screen pixels and horizontal ties keep value unchanged", async ({
  page,
}) => {
  await mount(page, 0);
  const { x, y } = await firstPoint(page);
  await page.mouse.move(x, y);
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.move(x + 2, y + 2);
  await expectPoint(page, 200, 0.3, 0);
  await page.mouse.move(x + 3, y + 3);
  await expectPoint(page, 204, 0.3, 1);
  await page.mouse.up();
  await page.keyboard.up("Shift");
});
