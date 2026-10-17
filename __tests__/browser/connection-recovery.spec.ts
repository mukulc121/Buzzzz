import { expect, test } from "@playwright/test";

const STUDIO = "http://127.0.0.1:5174";
const RELAY = "http://127.0.0.1:8788";
const harness = `
import * as ReactModule from '/node_modules/.vite/deps/react.js';
import * as DOMModule from '/node_modules/.vite/deps/react-dom_client.js';
import {useRelay} from '/src/features/connection/useRelay.ts';
const React=ReactModule.default??ReactModule;
const {createRoot}=DOMModule.default??DOMModule;
const NativeSocket=window.WebSocket;
const sockets=[];
class ControlledSocket {
  static OPEN=1;
  constructor(url){if(!String(url).startsWith('ws://127.0.0.1:8788/relay'))return new NativeSocket(url);this.url=String(url);this.readyState=0;sockets.push(this);}
  send(){}
  open(){this.readyState=1;this.onopen?.(new Event('open'));}
  close(){if(this.readyState===3)return;this.readyState=3;this.onclose?.(new CloseEvent('close',{code:1000}));}
  fail(){this.readyState=3;this.onclose?.(new CloseEvent('close',{code:1006}));}
}
window.WebSocket=ControlledSocket;
window.__relayRecovery={count:()=>sockets.length,fail:()=>sockets[0].fail(),open:()=>sockets.at(-1).open(),sameCredentials:()=>sockets[0].url===sockets.at(-1).url};
function Harness(){const relay=useRelay(()=>{});return React.createElement('div',null,
React.createElement('output',{id:'room'},relay.room?'ready':'none'),
React.createElement('output',{id:'connection'},relay.connected?'connected':'disconnected'),
React.createElement('output',{id:'error'},relay.error??''));}
createRoot(document.getElementById('root')).render(React.createElement(Harness));
`;

for (const status of [200, 401, 410] as const)
  test(`relay recovery ${status === 200 ? "retains" : "rotates"} room after authenticated probe ${status}`, async ({
    page,
  }) => {
    const entry = await (await page.request.get(`${STUDIO}/src/main.tsx`)).text();
    const react = entry.match(/from "([^"]*\/react\.js\?[^"]*)"/)?.[1];
    const dom = entry.match(/from "([^"]*\/react-dom_client\.js\?[^"]*)"/)?.[1];
    if (!react || !dom) throw new Error("Missing Vite React modules");
    let creations = 0;
    const authenticated: boolean[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(`${RELAY}/v1/rooms**`, async (route) => {
      const request = route.request();
      if (request.method() === "POST" && request.url() === `${RELAY}/v1/rooms`) {
        creations++;
        const roomId = (creations === 1 ? "a" : "b").repeat(32);
        const hostToken = (creations === 1 ? "h" : "j").repeat(43);
        await route.fulfill({
          status: 201,
          json: {
            roomId,
            hostToken,
            expiresAt: Date.now() + 86_400_000,
            pairing: { code: "123456", expiresAt: Date.now() + 600_000 },
            relayUrl: `ws://127.0.0.1:8788/relay?room=${roomId}&token=${hostToken}`,
          },
        });
      } else if (
        request.method() === "GET" &&
        new URL(request.url()).pathname.endsWith("/project")
      ) {
        authenticated.push(request.headers().authorization === `Bearer ${"h".repeat(43)}`);
        await route.fulfill({
          status,
          json:
            status === 200
              ? {
                  project: { presets: [], map: {} },
                  projectId: null,
                  revision: 0,
                }
              : { error: "Room unavailable" },
        });
      } else await route.abort();
    });
    await page.route(/\/src\/main\.tsx(?:\?.*)?$/, (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: harness
          .replace("/node_modules/.vite/deps/react.js", react)
          .replace("/node_modules/.vite/deps/react-dom_client.js", dom),
      }),
    );
    await page.goto(STUDIO);
    await expect(page.locator("#room")).toHaveText("ready");
    await expect
      .poll(() => page.evaluate(() => Reflect.get(window, "__relayRecovery").count()))
      .toBe(1);
    await page.evaluate(() => Reflect.get(window, "__relayRecovery").fail());
    await expect.poll(() => authenticated.length).toBe(1);
    expect(authenticated).toEqual([true]);
    await expect
      .poll(() => page.evaluate(() => Reflect.get(window, "__relayRecovery").count()))
      .toBe(2);
    expect(creations).toBe(status === 200 ? 1 : 2);
    expect(
      await page.evaluate(() => Reflect.get(window, "__relayRecovery").sameCredentials()),
    ).toBe(status === 200);
    await page.evaluate(() => Reflect.get(window, "__relayRecovery").open());
    await expect(page.locator("#connection")).toHaveText("connected");
    await expect(page.locator("#error")).toHaveText("");
    expect(errors).toEqual([]);
  });
