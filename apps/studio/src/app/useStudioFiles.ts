import { useLayoutEffect, useRef } from "react";
import { readImport } from "../features/imports/readImport";
import { exportPulsarBundle } from "../features/imports/exportPulsarBundle";
import { downloadBlob } from "../features/project/files";
import { exportProjectMedia } from "../features/project/mediaTransfer";
import { importProject } from "../features/project/importProject";
import type { AttachedTracks } from "../features/media/useAttachedTracks";
import type { useProject } from "../features/project/useProject";
import type { useComposer } from "../features/composer/useComposer";
import type { useRiveSession } from "../features/rive/useRiveSession";

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
  const importFile = async (file: File) => {
    const projectId = current.current;
    try {
      const data = await readImport(file);
      if (current.current !== projectId) return;
      switch (data.kind) {
        case "audio":
        case "animation":
          if (!document.isWriter) throw new Error("Open this project for editing to attach media");
          if (await media.importFile(data.file, data.kind))
            onInspector(data.kind === "audio" ? "sound" : "animation");
          return;
        case "rive":
          if (!document.isWriter) throw new Error("Open this project for editing to attach media");
          if (await media.importFile(file, "rive")) {
            session.setStateMachine(undefined);
            onInspector("animation");
          }
          return;
        case "pattern":
          document.addPreset(data.pattern, data.name);
          composer.fit();
          if (data.warnings?.length) onLog(data.warnings.join(" · "));
          break;
        case "project": {
          const attachments = data.media ?? [];
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
            name: data.name ?? file.name.replace(/\.[^.]+$/, ""),
            media: attachments,
            riv: data.riv,
          });
          document.catalog.refresh();
          if (current.current !== projectId) return;
          document.catalog.open(id);
          composer.setSelected(null);
          onLog(`Opened project · ${data.project.presets.length} patterns`);
          break;
        }
      }
      onError(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : `Could not read ${file.name}`);
    }
  };
  const exportProject = async () => {
    try {
      const blob = await exportPulsarBundle({
        project: document.project,
        name: document.projectName,
        riv: session.riv,
        stateMachine: session.stateMachine ?? document.project.riveStateMachine,
        media: await exportProjectMedia(document.projectId, document.project),
        durations: Object.fromEntries(
          document.project.presets.flatMap((preset) =>
            preset.editor?.durationMs === undefined ? [] : [[preset.id, preset.editor.durationMs]],
          ),
        ),
      });
      const name =
        document.projectName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "project";
      downloadBlob(`${name}.pulsar`, blob);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not export project");
    }
  };
  return { importFile, exportProject };
}
