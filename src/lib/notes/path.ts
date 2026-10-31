import { dayKey } from "@/lib/harvest/model";

export type DayNotesLayout = "flat" | "calendar";

export function dayNotePath(
  root: string,
  date: string,
  layout: DayNotesLayout = "calendar",
): string {
  if (layout === "flat") return `${root}/${date}.md`;
  return `${root}/${date.slice(0, 4)}/${date.slice(5, 7)}/${date}.md`;
}

export function pathForDay(root: string, day: Date, layout: DayNotesLayout = "calendar"): string {
  return dayNotePath(root, dayKey(day), layout);
}
