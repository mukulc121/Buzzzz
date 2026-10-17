import { useCallback, useEffect, useState } from "react";
import { parseEditorSettings, type IEditorSettings } from "./editorSettings";

const STORAGE_KEY = "buzzzz.editor-settings";
export function useEditorSettings() {
  const [values, setValues] = useState(() => {
    try {
      return parseEditorSettings(localStorage.getItem(STORAGE_KEY));
    } catch {
      return parseEditorSettings(null);
    }
  });
  const update = useCallback(
    <K extends keyof IEditorSettings>(key: K, value: IEditorSettings[K]) =>
      setValues((current) => ({ ...current, [key]: value })),
    [],
  );
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      return;
    }
  }, [values]);
  return { values, update };
}
