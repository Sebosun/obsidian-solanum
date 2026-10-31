export interface DebugConfig {
  enabled: boolean;
  autoFinishSeconds: number;
}

export function readDebugConfig(
  env: Record<string, string | undefined>,
  production: boolean,
): DebugConfig {
  const enabled = !production && env.SOLANUM_DEBUG === "true";
  const seconds = Number(env.SOLANUM_AUTO_FINISH_SECONDS ?? 0);
  return {
    enabled,
    autoFinishSeconds:
      enabled && Number.isFinite(seconds) && seconds >= 1 && seconds <= 3600 ? seconds : 0,
  };
}

declare const __SOLANUM_DEBUG__: boolean;
declare const __SOLANUM_AUTO_FINISH_SECONDS__: number;

export const DEBUG_CONFIG: DebugConfig = {
  enabled: typeof __SOLANUM_DEBUG__ !== "undefined" && __SOLANUM_DEBUG__,
  autoFinishSeconds:
    typeof __SOLANUM_AUTO_FINISH_SECONDS__ !== "undefined" ? __SOLANUM_AUTO_FINISH_SECONDS__ : 0,
};
