import { describe, expect, it } from "vitest";
import { planDayNoteMigration, moveDayNotes } from "@/lib/notes/migration";
import { MemoryDisk } from "./helpers/memoryDisk";

const FROM = "Solanum/days";
const TO = "Solanum";
const note = (date: string) =>
  `---\nsolanum: day\ndate: ${date}\n---\n# History\n\n## Notes\nKeep my reflection.\n`;

async function fixture() {
  const disk = new MemoryDisk();
  await disk.mkdir(FROM);
  disk.files.set(`${FROM}/2026-10-31.md`, note("2026-10-31"));
  disk.files.set(`${FROM}/2026-11-01.md`, note("2026-11-01"));
  disk.files.set(`${FROM}/unrelated.md`, "User writing");
  const renamed: string[] = [];
  const rename = async (from: string, to: string) => {
    if (disk.failWrites.has(to)) throw new Error("Rename interrupted");
    await disk.write(to, await disk.read(from));
    await disk.remove(from);
    renamed.push(from);
  };
  return { disk, rename, renamed };
}

describe("moving readable day notes into the calendar hierarchy", () => {
  it("previews only owned notes and changes nothing", async () => {
    const { disk } = await fixture();
    const before = [...disk.files];
    const plan = await planDayNoteMigration(disk, FROM, TO);
    expect(plan.moves).toEqual([
      { from: `${FROM}/2026-10-31.md`, to: "Solanum/2026/10/2026-10-31.md" },
      { from: `${FROM}/2026-11-01.md`, to: "Solanum/2026/11/2026-11-01.md" },
    ]);
    expect(plan.leftBehind).toEqual([`${FROM}/unrelated.md`]);
    expect([...disk.files]).toEqual(before);
  });

  it("uses the link-aware rename boundary and preserves the complete document", async () => {
    const { disk, rename, renamed } = await fixture();
    expect(await moveDayNotes(disk, FROM, TO, rename)).toBe(2);
    expect(renamed).toHaveLength(2);
    expect(disk.files.get("Solanum/2026/10/2026-10-31.md")).toBe(note("2026-10-31"));
    expect(disk.files.get(`${FROM}/unrelated.md`)).toBe("User writing");
    expect(disk.files.has(`${FROM}/2026-10-31.md`)).toBe(false);
  });

  it("refuses every destination collision before moving anything, even identical content", async () => {
    const { disk, rename, renamed } = await fixture();
    disk.files.set("Solanum/2026/11/2026-11-01.md", note("2026-11-01"));
    await expect(moveDayNotes(disk, FROM, TO, rename)).rejects.toThrow(/already exist/);
    expect(renamed).toEqual([]);
    expect(disk.files.has(`${FROM}/2026-10-31.md`)).toBe(true);
  });

  it("resumes after interruption without re-moving completed files", async () => {
    const { disk, rename, renamed } = await fixture();
    disk.failWrites.add("Solanum/2026/11/2026-11-01.md");
    await expect(moveDayNotes(disk, FROM, TO, rename)).rejects.toThrow(/Retry the document update/);
    expect(renamed).toHaveLength(1);
    disk.failWrites.clear();
    expect(await moveDayNotes(disk, FROM, TO, rename)).toBe(1);
    expect(renamed).toHaveLength(2);
  });

  it("keeps custom roots and ignores mismatched ownership or invalid dates", async () => {
    const { disk } = await fixture();
    disk.files.set(`${FROM}/2026-02-31.md`, note("2026-02-31"));
    disk.files.set(`${FROM}/2026-12-01.md`, note("2026-12-02"));
    const plan = await planDayNoteMigration(disk, FROM, "Journal/Focus");
    expect(plan.moves[0].to).toBe("Journal/Focus/2026/10/2026-10-31.md");
    expect(plan.moves).toHaveLength(2);
    expect(plan.leftBehind).toHaveLength(3);
  });
});
