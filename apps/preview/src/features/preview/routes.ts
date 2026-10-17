export const RIVE_DEMO_PATH = "/demos/rive-demo";

export function isRivePreviewPath(pathname: string) {
  return pathname === "/preview" || pathname === RIVE_DEMO_PATH;
}
