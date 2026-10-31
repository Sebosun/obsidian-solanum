export interface DebugConfig {
  enabled: boolean;
  autoFinishSeconds: number;
}

const MIN_AUTO_FINISH_SECONDS = 1;
/** An hour: longer than any auto-finish a developer would wait for. */
const MAX_AUTO_FINISH_SECONDS = 3600;

/** The one place that decides whether debug tools exist: never in a production build. */
export function readDebugConfig(
  env: Record<string, string | undefined>,
  production: boolean,
): DebugConfig {
  const enabled = !production && env.SOLANUM_DEBUG === "true";
  const seconds = Number(env.SOLANUM_AUTO_FINISH_SECONDS ?? 0);
  const inRange =
    Number.isFinite(seconds) &&
    seconds >= MIN_AUTO_FINISH_SECONDS &&
    seconds <= MAX_AUTO_FINISH_SECONDS;
  return { enabled, autoFinishSeconds: enabled && inRange ? seconds : 0 };
}

/** Raw build inputs, defined by esbuild. The gate itself lives in `readDebugConfig`. */
declare const __SOLANUM_DEBUG__: string | undefined;
declare const __SOLANUM_AUTO_FINISH_SECONDS__: string | undefined;
declare const __SOLANUM_PRODUCTION__: boolean | undefined;

/** Reads the build's defines (absent under test, where debug stays off) through the gate. */
export function readBuildDebugConfig(): DebugConfig {
  return readDebugConfig(
    {
      SOLANUM_DEBUG: typeof __SOLANUM_DEBUG__ === "undefined" ? undefined : __SOLANUM_DEBUG__,
      SOLANUM_AUTO_FINISH_SECONDS:
        typeof __SOLANUM_AUTO_FINISH_SECONDS__ === "undefined"
          ? undefined
          : __SOLANUM_AUTO_FINISH_SECONDS__,
    },
    typeof __SOLANUM_PRODUCTION__ === "undefined" ? true : __SOLANUM_PRODUCTION__,
  );
}

export const DEBUG_CONFIG: DebugConfig = readBuildDebugConfig();
