import { pad2 } from "@/lib/time";

/** Local calendar date as `YYYY-MM-DD`, the key days are stored and linked by. */
export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
