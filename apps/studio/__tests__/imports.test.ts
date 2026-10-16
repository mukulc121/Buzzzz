import { expect, test } from "bun:test";
import { emptyPattern } from "@buzzzz/core";
import { readImport } from "../src/app/imports";
test("validates every attachment before accepting a project import", async () => {
  const project = { presets: [{ id: "p1", name: "Test", pattern: emptyPattern() }], map: {} };
  const file = (data: unknown) => new File([JSON.stringify(data)], "project.json");
  await expect(readImport(file(project))).resolves.toMatchObject({ kind: "project", riv: null });
  await expect(
    readImport(file({ ...project, riv: { name: "bad.riv", data: btoa("invalid") } })),
  ).rejects.toThrow("Invalid Rive attachment");
  await expect(
    readImport(file({ ...project, riv: { name: "test.riv", data: btoa("RIVEdata") } })),
  ).resolves.toMatchObject({ kind: "project", riv: { name: "test.riv" } });
});

test("reimports a project containing a maximum-size Rive attachment", async () => {
  const bytes = Buffer.alloc(20 * 1024 * 1024);
  bytes.write("RIVE");
  const project = {
    presets: [{ id: "p1", name: "Test", pattern: emptyPattern() }],
    map: {},
    riv: { name: "large.riv", data: bytes.toString("base64") },
  };
  const imported = await readImport(new File([JSON.stringify(project)], "project.json"));
  expect(imported.kind).toBe("project");
  if (imported.kind !== "project") throw new Error("Expected a project import");
  expect(imported.riv?.buffer.byteLength).toBe(bytes.byteLength);
});

test("rejects oversized native files and project documents", async () => {
  await expect(
    readImport(new File([new Uint8Array(20 * 1024 * 1024 + 1)], "large.riv")),
  ).rejects.toThrow("Rive files must be 20 MB or smaller");
  await expect(
    readImport(new File([new Uint8Array(32 * 1024 * 1024 + 1)], "large.json")),
  ).rejects.toThrow("Project files must be 32 MB or smaller");
});
