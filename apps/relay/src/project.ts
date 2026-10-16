import { isProject, isRecord, type Project } from "@buzzzz/core";
import { HttpError, json, readJson } from "./security.ts";
import { isProjectId } from "./projectId.ts";

export class RoomProject {
  constructor(
    private storage: DurableObjectStorage,
    private active: () => void,
    private changed: (revision: number) => void,
  ) {}

  snapshot(): { project: Project | null; revision: number; projectId: string | null } {
    this.active();
    const row = this.storage.sql
      .exec<{ value: string; revision: number; project_id: string | null }>(
        "SELECT value, revision, project_id FROM project WHERE id = 1",
      )
      .toArray()[0];
    if (!row) return { project: null, revision: 0, projectId: null };
    const project: unknown = JSON.parse(row.value);
    if (!isProject(project)) throw new HttpError(500, "Stored project is invalid");
    return { project, revision: row.revision, projectId: row.project_id };
  }

  save(input: unknown): { project: Project; revision: number; projectId: string | null } {
    if (!isRecord(input) || !isProject(input.project))
      throw new HttpError(400, "A valid project is required");
    if (input.projectId !== undefined && !isProjectId(input.projectId))
      throw new HttpError(400, "A valid projectId is required");
    const project = input.project;
    const value = JSON.stringify(project);
    if (new TextEncoder().encode(value).byteLength > 1024 * 1024)
      throw new HttpError(413, "Project exceeds 1 MiB");
    const saved = this.storage.transactionSync(() => {
      const snapshot = this.snapshot();
      if (
        input.baseRevision !== undefined &&
        (!Number.isSafeInteger(input.baseRevision) || input.baseRevision !== snapshot.revision)
      )
        throw new HttpError(409, "Project revision changed", snapshot);
      const revision = snapshot.revision + 1;
      const projectId = isProjectId(input.projectId) ? input.projectId : snapshot.projectId;
      this.storage.sql.exec(
        "INSERT INTO project (id, value, revision, project_id) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value, revision = excluded.revision, project_id = excluded.project_id",
        value,
        revision,
        projectId,
      );
      this.storage.sql.exec("UPDATE shares SET project = ? WHERE project_id = ?", value, projectId);
      return { project, revision, projectId };
    });
    this.changed(saved.revision);
    return saved;
  }

  async handle(request: Request): Promise<Response> {
    if (request.method === "GET") return json(this.snapshot());
    if (request.method === "PUT") {
      const input = await readJson(request, 1024 * 1024);
      if (!isRecord(input) || !isProjectId(input.projectId))
        throw new HttpError(400, "A valid projectId is required");
      return json(this.save(input));
    }
    throw new HttpError(405, "Use GET or PUT");
  }
}
