import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const ORIGIN = "http://127.0.0.1:5174";
const harness = `
import * as ReactModule from '/node_modules/.vite/deps/react.js';
import * as DOMModule from '/node_modules/.vite/deps/react-dom_client.js';
import {useRive} from '/__rive-readiness.js';
const React=ReactModule.default??ReactModule;
const {createRoot}=DOMModule.default??DOMModule;
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {awaitViewReady:()=>promise,resolve};};
const first=deferred(),second=deferred(),last=deferred();
first.name='first';second.name='second';last.name='last';
function Harness(){
 const {riveViewRef,setHybridRef}=useRive();
 const [,render]=React.useReducer(value=>value+1,0);
 const previous=React.useRef(setHybridRef);
 const stable=previous.current===setHybridRef;
 return React.createElement('div',null,
  React.createElement('output',{id:'ready'},riveViewRef?.name??(riveViewRef===null?'detached':'waiting')),
  React.createElement('output',{id:'stable'},String(stable)),
  ...[
   ['Attach first',()=>setHybridRef.f(first)],['Resolve first',()=>first.resolve(true)],
   ['Attach second',()=>setHybridRef.f(second)],['Resolve second',()=>second.resolve(true)],
   ['Attach last',()=>setHybridRef.f(last)],['Fail last',()=>last.resolve(false)],
   ['Detach',()=>setHybridRef.f(null)],['Rerender',render]
  ].map(([name,onClick])=>React.createElement('button',{key:name,onClick},name)));
}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(Harness)));
`;

test("native Rive readiness survives hidden views, replacement and detach", async ({ page }) => {
  const entry = await (await page.request.get(`${ORIGIN}/src/main.tsx`)).text();
  const react = entry.match(/from "([^"]*\/react\.js\?[^"]*)"/)?.[1];
  const dom = entry.match(/from "([^"]*\/react-dom_client\.js\?[^"]*)"/)?.[1];
  if (!react || !dom) throw new Error("Missing Vite React modules");
  const source = await readFile(
    new URL(
      "../../node_modules/@rive-app/react-native/lib/module/hooks/useRive.js",
      import.meta.url,
    ),
    "utf8",
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install();
  await page.route("**/__rive-readiness.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: source.replace(
        /import\s+\{([^}]+)\}\s+from ['"]react['"];?/,
        (_match, names: string) =>
          `import * as ReactModule from ${JSON.stringify(react)};const {${names}}=ReactModule.default??ReactModule;`,
      ),
    }),
  );
  await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: harness
        .replace("/node_modules/.vite/deps/react.js", react)
        .replace("/node_modules/.vite/deps/react-dom_client.js", dom),
    }),
  );
  await page.goto(ORIGIN);
  await page.getByRole("button", { name: "Attach first", exact: true }).click();
  await page.clock.fastForward(5500);
  await expect(page.locator("#ready")).toHaveText("waiting");
  await page.getByRole("button", { name: "Attach second", exact: true }).click();
  await page.getByRole("button", { name: "Resolve first", exact: true }).click();
  await expect(page.locator("#ready")).toHaveText("waiting");
  await page.getByRole("button", { name: "Resolve second", exact: true }).click();
  await expect(page.locator("#ready")).toHaveText("second");
  await page.getByRole("button", { name: "Rerender", exact: true }).click();
  await expect(page.locator("#stable")).toHaveText("true");
  await page.getByRole("button", { name: "Detach", exact: true }).click();
  await expect(page.locator("#ready")).toHaveText("detached");
  await page.getByRole("button", { name: "Attach last", exact: true }).click();
  await expect(page.locator("#ready")).toHaveText("waiting");
  await page.getByRole("button", { name: "Fail last", exact: true }).click();
  await expect(page.locator("#ready")).toHaveText("detached");
  expect(errors).toEqual([]);
});
