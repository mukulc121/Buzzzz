import { createHash } from "node:crypto";
import { afterEach, expect, spyOn, test } from "bun:test";
import { parseMessage, rangePattern, toDevice, type Pattern } from "@buzzzz/core";
import { phoneMediaPlayback } from "../src/features/connection/phoneMedia";
import { documentPhoneMedia } from "../src/features/connection/documentPhoneMedia";
import {
  createPhoneUpload,
  phoneUploadTarget,
  type IPhoneUploadTarget,
} from "../src/features/connection/phoneUpload";

const target: IPhoneUploadTarget = {
  origin: "https://relay.example",
  roomId: "a".repeat(32),
  hostToken: "b".repeat(43),
};
const assetId = `${"c".repeat(32)}.bin`;
const downloadUrl = `${target.origin}/v1/rooms/${target.roomId}/assets/${assetId}?token=${"d".repeat(43)}`;
const file = new File(["actual audio bytes"], "sound.mp3", { type: "audio/mpeg" });
const animationFile = new File(['{"fr":60,"ip":0,"op":140,"w":512,"h":512}'], "explosion.json", {
  type: "application/json",
});
const pattern: Pattern = {
  discretePattern: [{ time: 1000, amplitude: 0.8, frequency: 0.2 }],
  continuousPattern: {
    amplitude: [{ time: 4500, value: 0.5 }],
    frequency: [],
  },
};
const preset = { resourceId: "my-preset", name: "FanfareSound" };
const remaining = rangePattern(pattern, 500, 2000);
const audio = { file, durationMs: 5000, startMs: 500, endMs: 4000 };
const animation = { file: animationFile, totalFrames: 140, frameRate: 60, width: 512, height: 512 };
const options = () => ({
  preset,
  pattern,
  remaining,
  durationMs: 5000,
  upload: createPhoneUpload(target),
  signal: new AbortController().signal,
});
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const realFetch = globalThis.fetch;
const fetchHandler = (
  handler: (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => Promise<Response>,
) => Object.assign(handler, { preconnect: realFetch.preconnect });
let fetchMock: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined;

afterEach(() => fetchMock?.mockRestore());

function uploads() {
  const requests: { url: string; init: RequestInit | undefined }[] = [];
  fetchMock = spyOn(globalThis, "fetch").mockImplementation(
    fetchHandler(async (input, init) => {
      requests.push({ url: String(input), init });
      const bytes = init?.body instanceof ArrayBuffer ? init.body.byteLength : 0;
      return Response.json({ assetId, path: downloadUrl, bytes });
    }),
  );
  return requests;
}

test("attached audio uploads its original bytes and sends full haptics with the source trim hash", async () => {
  const requests = uploads();
  const message = await phoneMediaPlayback({
    ...options(),
    audio: { ...audio, volume: 0.4, offsetMs: 20 },
  });
  const clipId = createHash("sha256")
    .update(await file.bytes())
    .digest("hex");
  const window = { startMs: 500, durationMs: 3500 };
  expect(message).toEqual({
    type: "audio-haptics",
    ...preset,
    durationMs: 5000,
    pattern: toDevice(pattern),
    version: hash({ pattern: toDevice(pattern), clipId, window }),
    audio: { clipId, downloadUrl, contentType: "audio/mpeg", size: file.size },
    window,
    volume: 0.4,
    offsetMs: 20,
  });
  expect(parseMessage(JSON.stringify(message))).toEqual(message);
  expect(requests).toHaveLength(1);
  expect(requests[0]?.url).toBe(`${target.origin}/v1/rooms/${target.roomId}/assets?kind=media`);
  expect(requests[0]?.init?.headers).toEqual({
    Authorization: `Bearer ${target.hostToken}`,
    "Content-Type": "audio/mpeg",
  });
  expect(requests[0]?.init?.body).toEqual(await file.arrayBuffer());
});

test("animation wins over audio, retaining all source metadata and the complete pattern", async () => {
  const requests = uploads();
  const message = await phoneMediaPlayback({ ...options(), animation, audio });
  const clipId = createHash("sha256")
    .update(await animationFile.bytes())
    .digest("hex");
  expect(message).toEqual({
    type: "animation-haptics",
    ...preset,
    durationMs: 5000,
    pattern: toDevice(pattern),
    version: hash({ pattern: toDevice(pattern), clipId }),
    animation: {
      clipId,
      downloadUrl,
      contentType: "application/json",
      size: animationFile.size,
      totalFrames: 140,
      frameRate: 60,
      width: 512,
      height: 512,
    },
  });
  expect(requests).toHaveLength(1);
  expect(requests[0]?.init?.body).toEqual(await animationFile.arrayBuffer());
});

test("only failed media delivery falls through animation, audio, then ranged pure haptics", async () => {
  const attempted: string[] = [];
  const request = options();
  const upload = async (source: File, contentType: string, signal: AbortSignal) => {
    attempted.push(source.name);
    if (source === animationFile) throw new Error("Animation upload failed");
    return request.upload(source, contentType, signal);
  };
  uploads();
  const message = await phoneMediaPlayback({ ...request, animation, audio, upload });
  expect(message.type).toBe("audio-haptics");
  expect(attempted).toEqual([animationFile.name, file.name]);
  fetchMock?.mockImplementation(
    fetchHandler(async () => new Response("Upload failed", { status: 503 })),
  );
  const fallback = await phoneMediaPlayback({ ...options(), animation, audio });
  expect(fallback).toEqual({
    type: "haptic-preset",
    ...preset,
    pattern: toDevice(remaining),
    version: hash(toDevice(remaining)),
  });
});

test("an untrimmed track omits window and defaults; changing trim changes its version without uploading twice", async () => {
  const requests = uploads();
  const request = options();
  const whole = await phoneMediaPlayback({
    ...request,
    audio: { ...audio, startMs: 0, endMs: 5000 },
  });
  expect(whole).not.toHaveProperty("window");
  expect(whole).not.toHaveProperty("volume");
  expect(whole).not.toHaveProperty("offsetMs");
  const trimmed = await phoneMediaPlayback({ ...request, audio });
  if (whole.type !== "audio-haptics" || trimmed.type !== "audio-haptics")
    throw new Error("Missing audio delivery");
  expect(whole.audio.clipId).toBe(trimmed.audio.clipId);
  expect(whole.version).not.toBe(trimmed.version);
  expect(requests).toHaveLength(1);
});

test("fractional audio trim rounds its original duration independently from the start", async () => {
  uploads();
  const message = await phoneMediaPlayback({
    ...options(),
    audio: { ...audio, startMs: 500.49, endMs: 4000.51 },
  });
  if (message.type !== "audio-haptics") throw new Error("Missing audio delivery");
  const window = { startMs: 500, durationMs: 3500 };
  expect(message.window).toEqual(window);
  expect(message.version).toBe(
    hash({ pattern: toDevice(pattern), clipId: message.audio.clipId, window }),
  );
  const whole = await phoneMediaPlayback({
    ...options(),
    audio: { ...audio, durationMs: 4703.999, startMs: 0, endMs: 4703.999 },
  });
  expect(whole).not.toHaveProperty("window");
});

test("signed downloads must belong to the paired room and rejected uploads remain retryable", async () => {
  const requests = uploads();
  const request = options();
  fetchMock?.mockImplementationOnce(
    fetchHandler(async () =>
      Response.json({
        assetId,
        path: downloadUrl.replace(target.roomId, "e".repeat(32)),
        bytes: file.size,
      }),
    ),
  );
  expect((await phoneMediaPlayback({ ...request, audio })).type).toBe("haptic-preset");
  expect((await phoneMediaPlayback({ ...request, audio })).type).toBe("audio-haptics");
  expect(requests).toHaveLength(1);
});

test("local uploads stay same-origin while their download URLs use the phone-reachable LAN target", async () => {
  fetchMock = spyOn(globalThis, "fetch").mockResolvedValueOnce(
    Response.json({
      origin: "http://192.168.0.111:5173",
      roomId: target.roomId,
      hostToken: target.hostToken,
    }),
  );
  const local = await phoneUploadTarget(null, new AbortController().signal);
  expect(fetchMock.mock.calls[0]?.[0]).toBe("/media/session");
  expect(local).toEqual({ ...target, origin: "http://192.168.0.111:5173", uploadOrigin: "" });
  fetchMock.mockResolvedValueOnce(
    Response.json({
      assetId,
      path: downloadUrl.replace(target.origin, local.origin),
      bytes: file.size,
    }),
  );
  const message = await phoneMediaPlayback({
    ...options(),
    upload: createPhoneUpload(local),
    audio,
  });
  expect(message.type).toBe("audio-haptics");
  expect(fetchMock.mock.calls[1]?.[0]).toBe(`/v1/rooms/${target.roomId}/assets?kind=media`);
});

test("document media uses the validated frame span and excludes tracks still hydrating for another pattern", () => {
  const source = {
    file: animationFile,
    durationMs: (140 / 60) * 1000,
    document: {
      data: { op: 150 },
      inFrame: 10,
      frameRate: 60,
      durationMs: (140 / 60) * 1000,
      width: 512,
      height: 512,
      nodes: [],
      warnings: [],
    },
  };
  const state = {
    preset: { pattern, editor: { markers: [], range: null, durationMs: 5500 } },
    ready: true,
    pending: {},
    audio: { source: { file, durationMs: 5000 }, trim: { startMs: 500, endMs: 4000 } },
    animation: { source },
  };
  expect(documentPhoneMedia(state)).toMatchObject({
    pattern,
    durationMs: 5500,
    audio: { file, durationMs: 5000, startMs: 500, endMs: 4000 },
    animation: { file: animationFile, totalFrames: 140, frameRate: 60, width: 512, height: 512 },
  });
  expect(documentPhoneMedia({ ...state, ready: false })).toEqual({ pattern, durationMs: 5500 });
  expect(
    documentPhoneMedia({ ...state, pending: { audio: "hydrate", animation: "hydrate" } }),
  ).toEqual({ pattern, durationMs: 5500 });
});

test("cancelling delivery does not fall back to another media type or publish stale haptics", async () => {
  const controller = new AbortController();
  const attempted: string[] = [];
  await expect(
    phoneMediaPlayback({
      ...options(),
      animation,
      audio,
      signal: controller.signal,
      upload: async (source) => {
        attempted.push(source.name);
        controller.abort();
        throw new DOMException("Aborted", "AbortError");
      },
    }),
  ).rejects.toThrow("aborted");
  expect(attempted).toEqual([animationFile.name]);
});

test("a fresh same-clip delivery replaces an aborted upload before its rejection cleanup", async () => {
  const controller = new AbortController();
  const requests = uploads();
  let announce: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    announce = resolve;
  });
  let rejectRequest: ((error: Error) => void) | undefined;
  fetchMock?.mockImplementationOnce(
    fetchHandler(
      async () =>
        new Promise<Response>((_resolve, reject) => {
          rejectRequest = reject;
          announce?.();
        }),
    ),
  );
  const upload = createPhoneUpload(target);
  const old = upload(file, "audio/mpeg", controller.signal).catch((error: unknown) => error);
  await started;
  controller.abort();
  const fresh = await upload(file, "audio/mpeg", new AbortController().signal);
  expect(fresh.downloadUrl).toBe(downloadUrl);
  rejectRequest?.(new DOMException("Aborted", "AbortError"));
  expect(await old).toBeInstanceOf(DOMException);
  expect(await upload(file, "audio/mpeg", new AbortController().signal)).toEqual(fresh);
  expect(requests).toHaveLength(1);
});
