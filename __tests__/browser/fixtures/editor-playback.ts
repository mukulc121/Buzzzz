import type { Page } from "@playwright/test";

const IDLE_LABEL =
  /^(?:Play “.+” - .+ · P|Connect a phone to play on device|Nothing to play - check the Preview switches|Nothing to play - the Frequency layer is empty, so the Intensity curve can't play · P|Nothing to play - the Intensity layer is empty, so the Frequency curve can't play · P)$/;

export const editorPlay = (page: Page) =>
  page.locator(".pattern-header").getByRole("button", { name: IDLE_LABEL });

export const editorStop = (page: Page) =>
  page.locator(".pattern-header").getByRole("button", { name: "Stop (P)", exact: true });
