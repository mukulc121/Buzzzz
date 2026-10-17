import { createHash } from "node:crypto";
import {
  test as base,
  type BrowserContext,
  type BrowserContextOptions,
  type TestInfo,
} from "@playwright/test";

interface IHosted {
  browserCallerIp: string;
  createHostedContext: (options?: BrowserContextOptions) => Promise<BrowserContext>;
}
const RELAY = "http://127.0.0.1:8788/**";

function callerIp(info: TestInfo, role: number) {
  const digest = createHash("sha256").update(`${info.testId}/${info.retry}`).digest("hex");
  const groups = digest.slice(0, 20).match(/.{4}/g);
  if (!groups) throw new Error("Could not assign a hosted test caller");
  return `2001:db8:${groups.join(":")}:${role.toString(16)}`;
}
async function identify(context: BrowserContext, ip: string) {
  await context.route(RELAY, (route) =>
    route.continue({
      headers: { ...route.request().headers(), "cf-connecting-ip": ip },
    }),
  );
}

export const test = base.extend<IHosted>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires destructured fixture arguments.
  browserCallerIp: async ({}, provide, info) => provide(callerIp(info, 1)),
  context: async ({ context, browserCallerIp }, provide) => {
    await identify(context, browserCallerIp);
    await provide(context);
  },
  request: async ({ playwright, baseURL, extraHTTPHeaders, ignoreHTTPSErrors }, provide, info) => {
    const request = await playwright.request.newContext({
      baseURL,
      ignoreHTTPSErrors,
      extraHTTPHeaders: { ...extraHTTPHeaders, "CF-Connecting-IP": callerIp(info, 2) },
    });
    try {
      await provide(request);
    } finally {
      await request.dispose();
    }
  },
  createHostedContext: async ({ browser, storageState }, provide, info) => {
    const contexts: BrowserContext[] = [];
    let role = 3;
    try {
      await provide(async (options) => {
        const context = await browser.newContext({ storageState, ...options });
        contexts.push(context);
        await identify(context, callerIp(info, role++));
        return context;
      });
    } finally {
      for (const context of contexts) await context.close();
    }
  },
});
