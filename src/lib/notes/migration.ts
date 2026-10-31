import type { FileAdapter } from "@/lib/storage/VaultSessionStore";
import { ensureFolder } from "@/lib/storage/ensureFolder";
import { dayNotePath } from "@/lib/notes/path";

export interface DayNoteMove {
  from: string;
  to: string;
}

export interface DayNoteMigrationPlan {
  from: string;
  to: string;
  moves: DayNoteMove[];
  conflicts: string[];
  leftBehind: string[];
}

function ownedDate(path: string, text: string): string | null {
  const match = /\/(\d{4})-(\d{2})-(\d{2})\.md$/.exec(path);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = `${year}-${month}-${day}`;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1];
  if (!frontmatter || !/^solanum: day\s*$/m.test(frontmatter)) return null;
  return new RegExp(`^date: ${date}\\s*$`, "m").test(frontmatter) ? date : null;
}

/** A read-only preview. Only recognized, dated Solanum documents can be moved. */
export async function planDayNoteMigration(
  adapter: FileAdapter,
  from: string,
  to: string,
): Promise<DayNoteMigrationPlan> {
  const plan: DayNoteMigrationPlan = { from, to, moves: [], conflicts: [], leftBehind: [] };
  if (!(await adapter.exists(from))) return plan;
  const { files } = await adapter.list(from);
  for (const path of [...files].sort()) {
    if (!path.endsWith(".md")) {
      plan.leftBehind.push(path);
      continue;
    }
    const date = ownedDate(path, await adapter.read(path));
    if (!date) {
      plan.leftBehind.push(path);
      continue;
    }
    const target = dayNotePath(to, date);
    if (await adapter.exists(target)) plan.conflicts.push(target);
    plan.moves.push({ from: path, to: target });
  }
  return plan;
}

/** Rechecks collisions, then delegates each move to Obsidian's link-aware file manager. */
export async function moveDayNotes(
  adapter: FileAdapter,
  from: string,
  to: string,
  rename: (from: string, to: string) => Promise<void>,
): Promise<number> {
  const plan = await planDayNoteMigration(adapter, from, to);
  if (plan.conflicts.length > 0)
    throw new Error(`Documents already exist at ${plan.conflicts.join(", ")}. Nothing was moved.`);
  let moved = 0;
  for (const move of plan.moves) {
    try {
      await ensureFolder(adapter, move.to.slice(0, move.to.lastIndexOf("/")));
      if (await adapter.exists(move.to)) throw new Error(`A document already exists at ${move.to}`);
      await rename(move.from, move.to);
      moved += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw Object.assign(
        new Error(
          `${moved} documents moved. ${reason}. Retry the document update or use “Write documents for all history”.`,
        ),
        { cause: error },
      );
    }
  }
  return moved;
}
