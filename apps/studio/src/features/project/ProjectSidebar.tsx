import { useState } from "react";
import { toDevice, type Pattern, type Project } from "@buzzzz/core";
import { FilePicker } from "../../components/FilePicker";
import { Copy, Download, Plus, Upload, X } from "../../components/icons";
import { Spark } from "../composer/Spark";
import { LazyLibrary as Library } from "../presets/LazyLibrary";
import { download } from "./files";

interface IProjectSidebar {
  project: Project;
  preset: Project["presets"][number];
  onPreview: (pattern: Pattern) => void;
  onAdd: (pattern?: Pattern, name?: string) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onImport: (file: File) => Promise<void>;
  onExport: () => Promise<void>;
}

const slug = (name: string) => name.trim().replace(/\W+/g, "-").toLowerCase() || "pattern";

export function ProjectSidebar(props: IProjectSidebar) {
  const { project, preset, onPreview, onAdd, onSelect, onRemove, onImport, onExport } = props;
  const [tab, setTab] = useState<"project" | "library">("project");

  return (
    <aside className="col left">
      <div className="seg tabs">
        <button className={tab === "project" ? "on" : ""} onClick={() => setTab("project")}>
          Project <span className="count">{project.presets.length}</span>
        </button>
        <button className={tab === "library" ? "on" : ""} onClick={() => setTab("library")}>
          Pulsar library
        </button>
      </div>

      {tab === "library" ? (
        <Library
          onPreview={onPreview}
          onAdd={(p, name) => {
            onAdd(p, name);
            setTab("project");
          }}
        />
      ) : (
        <>
          <div className="row">
            <button className="grow" onClick={() => onAdd()}>
              <Plus /> New
            </button>
            <button
              className="grow"
              onClick={() => onAdd(structuredClone(preset.pattern), preset.name + " copy")}
            >
              <Copy /> Duplicate
            </button>
          </div>
          <ul className="list">
            {project.presets.map((p) => {
              const triggers = Object.entries(project.map)
                .filter(([, id]) => id === p.id)
                .map(([t]) => t);
              return (
                <li key={p.id} className={p.id === preset.id ? "active" : ""}>
                  <button
                    className="preset-select"
                    aria-pressed={p.id === preset.id}
                    onClick={() => onSelect(p.id)}
                  >
                    <Spark pattern={p.pattern} />
                    <span className="grow">
                      {p.name}
                      {triggers.length > 0 && <small>▸ {triggers.join(", ")}</small>}
                    </span>
                  </button>
                  {project.presets.length > 1 && (
                    <button
                      className="icon reveal"
                      title="Delete"
                      aria-label={`Delete ${p.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(p.id);
                      }}
                    >
                      <X />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <footer className="files">
        <FilePicker
          accept=".json,.riv,.pulsar,.zip,.lottie,.ahap,.haptic,.mp3,.wav,.ogg,.m4a,.flac"
          onFile={onImport}
          className="button"
        >
          <Upload /> Import
        </FilePicker>
        <button
          onClick={() => download(slug(preset.name) + ".json", toDevice(preset.pattern))}
          title="This pattern, in Pulsar's device format"
        >
          <Download /> Pattern
        </button>
        <button
          onClick={onExport}
          title="Portable Pulsar bundle with patterns, mappings and attached media"
        >
          <Download /> Project
        </button>
      </footer>
    </aside>
  );
}
