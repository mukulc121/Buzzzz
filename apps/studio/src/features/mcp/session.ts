import type { Project } from "@buzzzz/core";
import type { IRoom } from "../connection/cloud";
import type { TConflictChoice } from "../project/model";
import { readCanonical, writeCanonical, type ICanonical } from "./api";
import { planSync, type ISyncBase } from "./sync";
import { storeSyncBase } from "./syncStorage";

export interface ISyncDocument {
  project: Project;
  begin: () => void;
  setProject: (project: Project) => void;
  saveCopy: () => Promise<boolean>;
}
export interface ISyncView {
  pending: boolean;
  conflict: ICanonical | null;
  error: string | null;
}
interface ISessionDeps {
  origin: string;
  room: Pick<IRoom, "roomId" | "hostToken">;
  projectId: string;
  bases: Map<string, ISyncBase>;
  document: () => ISyncDocument;
  onView: (patch: Partial<ISyncView>) => void;
  onError: (message: string) => void;
}

// Relay host requests share 60 per minute with MCP calls, so local edits push after a pause.
const PUSH_DELAY_MS = 2000;

// One room + project pairing: pulls on start and on remote revisions, pushes local edits.
export class CanonicalSession {
  private controller = new AbortController();
  private busy = false;
  private remote = 0;
  // Highest revision fetched or written here; conflicts and errors never re-drain it.
  private seen = -1;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private conflict: ICanonical | null = null;
  private applied: Project | null = null;

  private deps: ISessionDeps;

  constructor(deps: ISessionDeps) {
    this.deps = deps;
  }

  start(): Promise<void> {
    return this.run(() => this.pullWork());
  }

  stop(): void {
    this.controller.abort();
    clearTimeout(this.timer);
  }

  remoteChanged(revision: number): void {
    this.remote = Math.max(this.remote, revision);
    if (!this.busy && revision > this.seen) void this.run(() => this.pullWork());
  }

  localChanged(): void {
    clearTimeout(this.timer);
    const base = this.base();
    if (this.busy || this.conflict || !base || base.projectId !== this.deps.projectId) return;
    const project = this.deps.document().project;
    // Wait until the editor renders a remote apply before comparing.
    if (this.applied && project !== this.applied) return;
    this.applied = null;
    if (JSON.stringify(project) === base.json) return;
    this.timer = setTimeout(() => void this.run(() => this.pushWork(base.revision)), PUSH_DELAY_MS);
  }

  async resolve(choice: TConflictChoice): Promise<void> {
    const conflict = this.conflict;
    if (!conflict || this.busy) return;
    if (choice === "keep-mine" || !conflict.project)
      return this.run(() => this.pushWork(conflict.revision));
    // Theirs replaces the editor only once the copy of mine is stored.
    if (choice === "save-copy" && !(await this.deps.document().saveCopy())) return;
    if (this.controller.signal.aborted || this.conflict !== conflict) return;
    this.apply(conflict);
  }

  private base(): ISyncBase | undefined {
    return this.deps.bases.get(this.deps.room.roomId);
  }

  private view(patch: Partial<ISyncView>): void {
    if (!this.controller.signal.aborted) this.deps.onView(patch);
  }

  private async run(work: () => Promise<void>): Promise<void> {
    if (this.busy || this.controller.signal.aborted) return;
    clearTimeout(this.timer);
    this.busy = true;
    this.view({ pending: true });
    let failed = false;
    try {
      await work();
      this.view({ error: null });
    } catch (error) {
      failed = true;
      if (this.controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : "Room project sync failed";
      this.view({ error: message });
      this.deps.onError(message);
    } finally {
      this.busy = false;
      this.view({ pending: false });
      if (!failed && this.remote > this.seen) void this.run(() => this.pullWork());
      else if (!failed) this.localChanged();
    }
  }

  private see(revision: number): void {
    this.seen = Math.max(this.seen, revision);
  }

  private setConflict(conflict: ICanonical | null): void {
    this.conflict = conflict;
    this.view({ conflict });
  }

  private remember(revision: number, project: Project): void {
    const { bases, room, projectId } = this.deps;
    const base = { projectId, revision, json: JSON.stringify(project) };
    bases.set(room.roomId, base);
    storeSyncBase(room.roomId, base);
    this.setConflict(null);
  }

  private apply(canonical: ICanonical): void {
    if (!canonical.project) return;
    const { begin, setProject } = this.deps.document();
    this.applied = canonical.project;
    begin();
    setProject(canonical.project);
    begin();
    this.remember(canonical.revision, canonical.project);
  }

  private async pushWork(baseRevision: number): Promise<void> {
    const project = this.deps.document().project;
    const { origin, room, projectId } = this.deps;
    const signal = this.controller.signal;
    const outcome = await writeCanonical(
      origin,
      room,
      { project, baseRevision, projectId },
      signal,
    );
    if (outcome.kind === "conflict") {
      this.see(outcome.canonical.revision);
      this.setConflict(outcome.canonical);
    } else {
      this.see(outcome.revision);
      this.remember(outcome.revision, project);
    }
  }

  private async pullWork(): Promise<void> {
    const canonical = await readCanonical(this.deps.origin, this.deps.room, this.controller.signal);
    this.see(canonical.revision);
    const local = this.deps.document().project;
    const plan = planSync({
      canonical,
      localJson: JSON.stringify(local),
      base: this.base(),
      projectId: this.deps.projectId,
    });
    if (plan === "push") return this.pushWork(canonical.revision);
    if (plan === "conflict") return this.setConflict(canonical);
    if (plan === "adopt") return this.remember(canonical.revision, local);
    this.apply(canonical);
  }
}
