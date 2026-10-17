import { expect, test, type Route } from "@playwright/test";
const ORIGIN = "http://127.0.0.1:5174";
const RELAY = "http://127.0.0.1:8788";
const roomId = "a".repeat(32);
const harness = `
import * as ReactModule from '/node_modules/.vite/deps/react.js';
import * as DOMModule from '/node_modules/.vite/deps/react-dom_client.js';
import {useUploadedRive} from '/src/features/rive/useUploadedRive.ts';
const React=ReactModule.default??ReactModule;
const {createRoot}=DOMModule.default??DOMModule;
const room={roomId:'${roomId}',hostToken:'${"h".repeat(43)}',expiresAt:Date.now()+86400000,pairing:{code:'123456',expiresAt:Date.now()+600000},relayUrl:'ws://127.0.0.1:8788/relay'};
const buffers=[new Uint8Array([82,73,86,69,1]).buffer,new Uint8Array([82,73,86,69,2]).buffer];
function Child(props){const path=useUploadedRive({buffer:props.buffer,enabled:props.enabled,room,onError:props.onError});return React.createElement('output',{id:'path'},path??'none');}
function Harness(){const[index,setIndex]=React.useState(0);const[enabled,setEnabled]=React.useState(true);const[mounted,setMounted]=React.useState(true);const[error,setError]=React.useState('');return React.createElement('div',null,
React.createElement('button',{onClick:()=>setEnabled(false)},'Disconnect'),React.createElement('button',{onClick:()=>setEnabled(true)},'Reconnect'),React.createElement('button',{onClick:()=>setIndex(1)},'Replace'),React.createElement('button',{onClick:()=>setMounted(false)},'Unmount'),
mounted?React.createElement(Child,{buffer:buffers[index],enabled,onError:setError}):React.createElement('output',{id:'unmounted'},'unmounted'),React.createElement('output',{id:'error'},error));}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(Harness)));
`;
test("Rive uploads survive peer reconnects and clean up replaced pending uploads under StrictMode", async ({
  page,
}) => {
  const entry = await (await page.request.get(`${ORIGIN}/src/main.tsx`)).text();
  const react = entry.match(/from "([^"]*\/react\.js\?[^"]*)"/)?.[1];
  const dom = entry.match(/from "([^"]*\/react-dom_client\.js\?[^"]*)"/)?.[1];
  if (!react || !dom) throw new Error("Missing Vite React modules");
  const pending: Route[] = [];
  const deleted: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(`${RELAY}/v1/rooms/${roomId}/assets**`, async (route) => {
    if (route.request().method() === "POST") {
      pending.push(route);
      return;
    }
    deleted.push(new URL(route.request().url()).pathname);
    await route.fulfill({ json: { revoked: true } });
  });
  await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: harness
        .replace("/node_modules/.vite/deps/react.js", react)
        .replace("/node_modules/.vite/deps/react-dom_client.js", dom),
    }),
  );
  await page.goto(ORIGIN);
  await expect.poll(() => pending.length).toBe(1);
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  const path = (id: string) =>
    `${RELAY}/v1/rooms/${roomId}/assets/${id.repeat(32)}.riv?token=${"t".repeat(43)}`;
  await pending[0].fulfill({ json: { path: path("b") } });
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(page.locator("#path")).toHaveText(path("b"));
  expect(pending).toHaveLength(1);
  expect(deleted).toHaveLength(0);
  await page.getByRole("button", { name: "Replace", exact: true }).click();
  await expect.poll(() => pending.length).toBe(2);
  await expect.poll(() => deleted.length).toBe(1);
  await page.getByRole("button", { name: "Unmount", exact: true }).click();
  await pending[1].fulfill({ json: { path: path("c") } });
  await expect.poll(() => deleted.length).toBe(2);
  expect(deleted).toEqual([
    `/v1/rooms/${roomId}/assets/${"b".repeat(32)}.riv`,
    `/v1/rooms/${roomId}/assets/${"c".repeat(32)}.riv`,
  ]);
  expect(errors).toEqual([]);
  await expect(page.locator("#error")).toHaveText("");
});
