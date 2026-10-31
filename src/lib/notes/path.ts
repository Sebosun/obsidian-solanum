import { dayKey } from "@/lib/harvest/model";

export function dayNotePath(root: string, date: string): string {
  return `${root}/${date.slice(0, 4)}/${date.slice(5, 7)}/${date}.md`;
}

export function pathForDay(root: string, day: Date): string {
  return dayNotePath(root, dayKey(day));
}
