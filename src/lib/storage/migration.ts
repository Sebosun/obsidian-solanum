import { ensureFolder } from "@/lib/storage/ensureFolder";
import { isRevision } from "@/lib/storage/validation";
import type { FileAdapter } from "@/lib/storage/VaultSessionStore";

export interface MigrationAdapter extends FileAdapter {
  remove(path: string): Promise<unknown>;
  rmdir(path: string, recursive: boolean): Promise<unknown>;
}

export interface MovePlan {
  /** Session files that will be copied and removed from the source. */
  toMove: number;
  /** Session files the destination already holds with identical content. */
  alreadyThere: number;
  /** Destination files that share a name with a source file but differ in content. */
  conflicts: string[];
  /** Source paths that are not valid sessions. They are never touched. */
  leftBehind: string[];
}

export interface MoveResult {
  moved: number;
  alreadyThere: number;
  leftBehind: string[];
}

interface Candidate {
  source: string;
  target: string;
  text: string;
  duplicate: boolean;
}

interface Inspection {
  candidates: Candidate[];
  conflicts: string[];
  leftBehind: string[];
}

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

function isSession(text: string): boolean {
  try {
    return isRevision(JSON.parse(text));
  } catch {
    return false;
  }
}

async function inspect(adapter: MigrationAdapter, from: string, to: string): Promise<Inspection> {
  const result: Inspection = { candidates: [], conflicts: [], leftBehind: [] };
  if (from === to || !(await adapter.exists(from))) return result;
  const { files } = await adapter.list(from);
  for (const source of [...files].sort()) {
    let text: string;
    try {
      text = await adapter.read(source);
    } catch (error) {
      // Another device may have moved it between listing and reading.
      if (!(await adapter.exists(source))) continue;
      throw error;
    }
    if (!source.endsWith(".json") || !isSession(text)) {
      result.leftBehind.push(source);
      continue;
    }
    const target = `${to}/${baseName(source)}`;
    if (!(await adapter.exists(target))) {
      result.candidates.push({ source, target, text, duplicate: false });
    } else if ((await adapter.read(target)) === text) {
      result.candidates.push({ source, target, text, duplicate: true });
    } else {
      result.conflicts.push(target);
    }
  }
  return result;
}

/** Counts what a move would do without changing anything. */
export async function planSessionMove(
  adapter: MigrationAdapter,
  from: string,
  to: string,
): Promise<MovePlan> {
  const found = await inspect(adapter, from, to);
  const duplicates = found.candidates.filter((candidate) => candidate.duplicate).length;
  return {
    toMove: found.candidates.length - duplicates,
    alreadyThere: duplicates,
    conflicts: found.conflicts,
    leftBehind: found.leftBehind,
  };
}

/** A source another device already removed is exactly the outcome we wanted. */
async function removeSource(adapter: MigrationAdapter, source: string): Promise<void> {
  try {
    await adapter.remove(source);
  } catch (error) {
    if (await adapter.exists(source)) throw error;
  }
}

async function isEmpty(adapter: MigrationAdapter, folder: string): Promise<boolean> {
  const { files, folders } = await adapter.list(folder);
  return files.length === 0 && folders.length === 0;
}

/**
 * Merges every session file from `from` into `to`. Each file is copied, verified, then removed,
 * so an interruption leaves nothing lost and a re-run finishes the job. Differing files with the
 * same name abort the whole move before anything changes.
 */
export async function moveSessions(
  adapter: MigrationAdapter,
  from: string,
  to: string,
): Promise<MoveResult> {
  const found = await inspect(adapter, from, to);
  if (found.conflicts.length > 0)
    throw new Error(
      `Cannot move sessions: ${found.conflicts.map(baseName).join(", ")} already exist in ${to} with different content. Nothing was moved.`,
    );
  if (found.candidates.length > 0) await ensureFolder(adapter, to);
  const total = found.candidates.length;
  let done = 0;
  let moved = 0;
  let alreadyThere = 0;
  for (const candidate of found.candidates) {
    try {
      if (!candidate.duplicate) {
        await adapter.write(candidate.target, candidate.text);
        if ((await adapter.read(candidate.target)) !== candidate.text)
          throw new Error("copy did not match the original");
      }
      await removeSource(adapter, candidate.source);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      // `cause` needs an ES2022 lib; the bundle targets ES2020.
      throw Object.assign(
        new Error(
          `Could not move ${baseName(candidate.source)}: ${reason}. ${done} of ${total} moved; try again to finish.`,
        ),
        { cause: error },
      );
    }
    done += 1;
    if (candidate.duplicate) alreadyThere += 1;
    else moved += 1;
  }
  if (total > 0 && found.leftBehind.length === 0 && (await isEmpty(adapter, from)))
    await adapter.rmdir(from, false);
  return { moved, alreadyThere, leftBehind: found.leftBehind };
}
