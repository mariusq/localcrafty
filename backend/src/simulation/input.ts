import type { SimulationSettings } from "@localcraft/shared";

export const defaultSimulationSettings: Required<SimulationSettings> = {
  iterations: 10_000,
  fightStyle: "Patchwerk",
  desiredTargets: 1,
  maxTime: 300,
};

function positiveInteger(value: unknown, fallback: number, label: string): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || (value as number) < 1) throw new Error(`${label} must be a positive whole number.`);
  return value as number;
}

export function normalizeSimulationSettings(settings?: Partial<SimulationSettings>): Required<SimulationSettings> {
  const fightStyle = settings?.fightStyle ?? defaultSimulationSettings.fightStyle;
  if (typeof fightStyle !== "string" || !/^[A-Za-z][A-Za-z0-9_ -]{0,50}$/.test(fightStyle)) {
    throw new Error("Fight style contains unsupported characters.");
  }

  return {
    iterations: positiveInteger(settings?.iterations, defaultSimulationSettings.iterations, "Iterations"),
    fightStyle,
    desiredTargets: positiveInteger(settings?.desiredTargets, defaultSimulationSettings.desiredTargets, "Targets"),
    maxTime: positiveInteger(settings?.maxTime, defaultSimulationSettings.maxTime, "Maximum fight time"),
  };
}

export function createQuickSimInput(simcText: string, settings: Required<SimulationSettings>): string {
  const profile = simcText.replace(/^\uFEFF/, "").trim();
  return `${profile}\n\n# LocalCraft quick-sim settings\niterations=${settings.iterations}\nfight_style=${settings.fightStyle}\ndesired_targets=${settings.desiredTargets}\nmax_time=${settings.maxTime}\njson2=/work/result.json\n`;
}
