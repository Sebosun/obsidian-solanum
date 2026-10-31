import { MS_PER_MINUTE } from "@/lib/time";

/** The shortest and longest a focus or break may be, in minutes. */
export const MIN_DURATION_MINUTES = 1;
export const MAX_DURATION_MINUTES = 24 * 60;
export const MIN_DURATION_MS = MIN_DURATION_MINUTES * MS_PER_MINUTE;
export const MAX_DURATION_MS = MAX_DURATION_MINUTES * MS_PER_MINUTE;

/** What a fresh install starts with, in minutes. */
export const DEFAULT_FOCUS_MINUTES = 25;
export const DEFAULT_BREAK_MINUTES = 5;
