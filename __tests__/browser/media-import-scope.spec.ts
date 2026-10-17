import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { isProjectRecord } from "../../apps/studio/src/features/project/model";

async function activeRecord(page: Page) {
  const value: unknown = await page.evaluate(() => {
    const id = localStorage.getItem("buzzzz.lastProject");
    return JSON.parse(localStorage.getItem(`buzzzz.project.${id}`) ?? "null");
  });
  if (!isProjectRecord(value)) throw new Error("Missing active project record");
  return value;
}

test("an immediately closed media picker cannot import its queued files into another project", async ({
  page,
}) => {
  let releaseFirst = () => {};
  const firstRead = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const parsed: string[] = [];
  const finished: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.exposeFunction("__mediaReadStarted", async (name: string) => {
    parsed.push(name);
    if (name === "slow.json") await firstRead;
  });
  await page.exposeFunction("__mediaImportFinished", (name: string) => finished.push(name));
  await page.routeWebSocket("**/relay?role=studio", (socket) =>
    socket.send(JSON.stringify({ type: "peers", phones: 0 })),
  );
  await page.route(/\/src\/features\/imports\/readImport\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const boundary = "async function readImport(file) {";
    if (!source.includes(boundary)) throw new Error("Missing file parser boundary");
    await route.fulfill({
      response,
      body: source.replace(boundary, `${boundary} await globalThis.__mediaReadStarted(file.name);`),
    });
  });
  await page.route(/\/src\/app\/useStudioFiles\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const completion = "await readFile(file);";
    if (!source.includes(completion)) throw new Error("Missing file import completion");
    await route.fulfill({
      response,
      body: source.replace(
        completion,
        `${completion} await globalThis.__mediaImportFinished(file.name);`,
      ),
    });
  });
  try {
    await page.goto("/");
    await expect(page.locator(".save-status")).toHaveAttribute("data-status", "editing");
    const original = await activeRecord(page);
    await page.getByRole("button", { name: "Media", exact: true }).click();
    await page.getByRole("button", { name: "Upload media", exact: true }).click();
    const uploader = page.getByRole("dialog", { name: "Upload media", exact: true });
    const [picker] = await Promise.all([
      page.waitForEvent("filechooser"),
      uploader.getByRole("button", { name: "Choose files", exact: true }).click(),
    ]);
    await picker.setFiles([
      {
        name: "slow.json",
        mimeType: "application/json",
        buffer: readFileSync("apps/preview/src/features/demos/lottie/bounce.json"),
      },
      {
        name: "spill.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            discretePattern: [],
            continuousPattern: { amplitude: [], frequency: [] },
          }),
        ),
      },
    ]);
    await expect.poll(() => parsed).toEqual(["slow.json"]);
    await expect(uploader).toHaveCount(0);
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page
      .locator(".project-dashboard-header")
      .getByRole("button", { name: "Create new project", exact: true })
      .click();
    const create = page.getByRole("dialog", { name: "Create project", exact: true });
    await create.getByLabel("Project name").fill("Other media import project");
    await create.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.locator(".save-status")).toHaveAttribute("data-status", "editing");
    const other = await activeRecord(page);
    expect(other.id).not.toBe(original.id);
    releaseFirst();
    await expect.poll(() => finished).toEqual(["slow.json", "spill.json"]);
    expect(parsed).toEqual(["slow.json"]);
    expect((await activeRecord(page)).project).toEqual(other.project);
    await page.getByRole("button", { name: "Media", exact: true }).click();
    await expect(page.getByRole("heading", { name: "No media yet", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page.getByRole("button", { name: original.name, exact: true }).click();
    expect((await activeRecord(page)).project).toEqual(original.project);
    await page.getByRole("button", { name: "Media", exact: true }).click();
    await expect(page.getByRole("heading", { name: "No media yet", exact: true })).toBeVisible();
    await page.reload();
    expect((await activeRecord(page)).project).toEqual(original.project);
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page.getByRole("button", { name: other.name, exact: true }).click();
    expect((await activeRecord(page)).project).toEqual(other.project);
    expect(errors).toEqual([]);
  } finally {
    releaseFirst();
  }
});
