import { useLayoutEffect, useRef } from "react";
import { readImport } from "../features/imports/readImport";
import { exportPulsarBundle } from "../features/imports/exportPulsarBundle";
import { downloadBlob } from "../features/project/files";
import { exportProjectMedia } from "../features/project/mediaTransfer";
import { importProject } from "../features/project/importProject";
import { loadSampleProject } from "../features/project/starter/loadSampleProject";
import type { Imported } from "../features/imports/model";
import type { AttachedTracks } from "../features/media/useAttachedTracks";
import type { useProject } from "../features/project/useProject";
import type { useComposer } from "../features/composer/useComposer";
import type { useRiveSession } from "../features/rive/useRiveSession";
import { exportName, selectExportProject, type IExportSelection } from "../features/export/model";

interface IStudioFiles {
  document: ReturnType<typeof useProject>;
  composer: ReturnType<typeof useComposer>;
  session: ReturnType<typeof useRiveSession>;
  media: AttachedTracks;
  onError: (message: string | null) => void;
  onInspector: (tab: "sound" | "animation") => void;
  onLog: (message: string) => void;
}

export function useStudioFiles(props: IStudioFiles) {
  const { document, composer, session, media, onError, onInspector, onLog } = props;
  const current = useRef(document.projectId);
  useLayoutEffect(() => {
    current.current = document.projectId;
  }, [document.projectId]);
  const openImportedProject = async (
    data: Extract<Imported, { kind: "project" }>,
    name: string,
    projectId: string,
  ) => {
    const project = {
      ...data.project,
      riveStateMachine: data.stateMachine ?? data.project.riveStateMachine,
      presets: data.project.presets.map((preset) =>
        data.durations?.[preset.id] === undefined
          ? preset
          : {
              ...preset,
              editor: {
                markers: [],
                range: null,
                ...preset.editor,
                durationMs: data.durations[preset.id],
              },
            },
      ),
    };
    const id = await importProject({
      project,
      name: data.name ?? name,
      media: data.media ?? [],
      riv: data.riv,
    });
    document.catalog.refresh();
    if (current.current !== projectId) return;
    document.catalog.open(id);
    composer.setSelected(null);
    onLog(`Opened project · ${data.project.presets.length} patterns`);
  };
  const readFile = async (file: File): Promise<string | null> => {
    const projectId = current.current;
    try {
      const data = await readImport(file);
      if (current.current !== projectId) return null;
      switch (data.kind) {
        case "audio":
        case "animation":
          if (!document.isWriter) throw new Error("Open this project for editing to attach media");
          if (await media.importFile(data.file, data.kind))
            onInspector(data.kind === "audio" ? "sound" : "animation");
          return null;
        case "rive":
          if (!document.isWriter) throw new Error("Open this project for editing to attach media");
          if (await media.importFile(file, "rive")) {
            session.setStateMachine(undefined);
            onInspector("animation");
          }
          return null;
        case "pattern":
          document.addPreset(data.pattern, data.name);
          if (data.warnings?.length) onLog(data.warnings.join(" · "));
          break;
        case "project": {
          await openImportedProject(data, file.name.replace(/\.[^.]+$/, ""), projectId);
          break;
        }
      }
      onError(null);
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : `Could not read ${file.name}`;
      onError(message);
      return message;
    }
  };
  const importFile = async (file: File) => {
    await readFile(file);
  };
  const createSampleProject = async (): Promise<string | null> => {
    const projectId = current.current;
    try {
      const data = await loadSampleProject();
      if (current.current !== projectId) return null;
      await openImportedProject(data, "Starting Demo Project", projectId);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Could not create the sample project.";
    }
  };
  const attachMediaAsset = async (assetId: string) => {
    const projectId = current.current;
    const item = media.library.items.find(
      (entry) => entry.id === assetId && entry.projectId === projectId,
    );
    if (!document.isWriter || !item || !(await media.attachAsset(assetId))) return false;
    if (current.current !== projectId) return false;
    if (item.kind === "rive") session.setStateMachine(undefined);
    onInspector(item.kind === "audio" ? "sound" : "animation");
    return true;
  };
  const exportProject = async (selection?: IExportSelection): Promise<string | null> => {
    try {
      const project = selectExportProject(document.project, selection);
      const title = exportName(project, document.projectName);
      const blob = await exportPulsarBundle({
        project,
        name: title,
        riv: session.riv,
        stateMachine: session.stateMachine ?? document.project.riveStateMachine,
        media: await exportProjectMedia(document.projectId, project, selection),
        durations: Object.fromEntries(
          project.presets.flatMap((preset) =>
            preset.editor?.durationMs === undefined ? [] : [[preset.id, preset.editor.durationMs]],
          ),
        ),
      });
      const name = title.replace(/[^A-Za-z0-9._-]+/g, "-").toLowerCase() || "pack";
      downloadBlob(`${name}.pulsar`, blob);
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not export project";
      return message;
    }
  };
  return {
    importFile,
    importFileResult: readFile,
    createSampleProject,
    attachMediaAsset,
    exportProject,
  };
}
