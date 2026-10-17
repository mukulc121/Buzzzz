const PREFIX = "buzzzz.selectedPattern.";

export function readSelectedPattern(projectId: string) {
  try {
    return localStorage.getItem(PREFIX + projectId);
  } catch {
    return null;
  }
}

export function rememberSelectedPattern(projectId: string, patternId: string) {
  try {
    localStorage.setItem(PREFIX + projectId, patternId);
  } catch {}
}
