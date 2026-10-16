import { expect, test, type Route } from "@playwright/test";

const ORIGIN = "http://127.0.0.1:5174";
const RELAY = "http://127.0.0.1:8788";
const asset = `${RELAY}/v1/rooms/${"a".repeat(32)}/assets/${"b".repeat(32)}.bin?token=${"t".repeat(43)}`;
const harness = `
import * as ReactModule from '/node_modules/.vite/deps/react.js';
import * as DOMModule from '/node_modules/.vite/deps/react-dom_client.js';
import {useMcpBridge} from '/src/features/mcp/useMcpBridge.ts';
const React=ReactModule.default??ReactModule;
const {createRoot}=DOMModule.default??DOMModule;
let listener;const results=[];let mutations=0;
const subscribe=(next)=>{listener=next;return()=>{listener=null;};};
const send=(result)=>results.push(result);
window.__mcpBudget={enqueue:()=>{
listener({type:'editor-command',requestId:'first',command:'media_attach',args:{kind:'animation',filename:'test.json',assetUrl:'${asset}'}});
listener({type:'editor-command',requestId:'second',command:'editor_range',args:{enabled:true,startMs:100,endMs:200}});
},count:()=>results.length,last:()=>results.at(-1),mutations:()=>mutations};
const room={roomId:'${"a".repeat(32)}',hostToken:'${"h".repeat(43)}',expiresAt:Date.now()+86400000,pairing:{code:'123456',expiresAt:Date.now()+600000},relayUrl:'ws://127.0.0.1:8788/relay'};
function Harness(){const bridge=useMcpBridge({room,connected:true,subscribe,send,document:{isWriter:true},composer:{range:null,setRange:()=>mutations++},media:{importFile:async()=>{mutations++;return true;}}});return React.createElement('output',{id:'busy'},String(bridge.busy));}
createRoot(document.getElementById('root')).render(React.createElement(Harness));
`;

test("queued MCP mutations expire from arrival without changing the document", async ({ page }) => {
  const entry = await (await page.request.get(`${ORIGIN}/src/main.tsx`)).text();
  const react = entry.match(/from "([^"]*\/react\.js\?[^"]*)"/)?.[1];
  const dom = entry.match(/from "([^"]*\/react-dom_client\.js\?[^"]*)"/)?.[1];
  if (!react || !dom) throw new Error("Missing Vite React modules");
  let requested = false;
  let deliver: (route: Route) => void = () => {};
  const pending = new Promise<Route>((resolve) => {
    deliver = resolve;
  });
  await page.route(asset, (route) => {
    requested = true;
    deliver(route);
  });
  await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: harness
        .replace("/node_modules/.vite/deps/react.js", react)
        .replace("/node_modules/.vite/deps/react-dom_client.js", dom),
    }),
  );
  await page.clock.install();
  await page.goto(ORIGIN);
  await expect(page.locator("#busy")).toHaveText("false");
  await page.evaluate(() => Reflect.get(window, "__mcpBudget").enqueue());
  await expect.poll(() => requested).toBe(true);
  await page.clock.fastForward(26_000);
  await (await pending).abort();
  await expect(page.locator("#busy")).toHaveText("false");
  await page.clock.runFor(501);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "__mcpBudget").count())).toBe(2);
  const result = await page.evaluate(() => Reflect.get(window, "__mcpBudget").last());
  expect(result.requestId).toBe("second");
  expect(result.error).toContain("ran out of time");
  expect(await page.evaluate(() => Reflect.get(window, "__mcpBudget").mutations())).toBe(0);
});
