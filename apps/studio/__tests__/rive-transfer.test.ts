import { expect, test } from "bun:test";
import { serializeRiveAttachment } from "../src/features/media/riveTransfer";

function gate() {
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { ready, release: () => release() };
}

test("Rive attachment serialization includes rollback before the next predecessor is captured", async () => {
  const first = gate();
  const second = gate();
  const entered = gate();
  const events: string[] = [];
  let asset = "original";
  const a = serializeRiveAttachment("same-project", async () => {
    const previous = asset;
    asset = "a";
    events.push("a-write");
    entered.release();
    await first.ready;
    asset = previous;
    events.push("a-rollback");
  });
  await entered.ready;
  const b = serializeRiveAttachment("same-project", async () => {
    const previous = asset;
    asset = "b";
    events.push("b-write");
    await second.ready;
    asset = previous;
    events.push("b-rollback");
  });
  expect(events).toEqual(["a-write"]);
  first.release();
  await a;
  second.release();
  await b;
  expect(events).toEqual(["a-write", "a-rollback", "b-write", "b-rollback"]);
  expect(asset).toBe("original");
});

test("an unrelated project and later operations are not blocked by failure", async () => {
  const first = gate();
  const a = serializeRiveAttachment("blocked-project", async () => {
    await first.ready;
    throw new Error("failed commit");
  });
  expect(await serializeRiveAttachment("other-project", async () => "independent")).toBe(
    "independent",
  );
  const later = serializeRiveAttachment("blocked-project", async () => "later");
  first.release();
  await expect(a).rejects.toThrow("failed commit");
  expect(await later).toBe("later");
});
