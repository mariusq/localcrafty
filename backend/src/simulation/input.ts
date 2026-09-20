import type { EquipmentSlot, GearItem, SimulationSettings } from "@localcraft/shared";

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

function itemDefinition(item: GearItem, slot: EquipmentSlot): string {
  if (item.slot !== slot || /[\r\n]/.test(item.rawDefinition)) throw new Error("Candidate item is not valid for the selected slot.");
  // Bag alternatives originate as commented addon lines, for example
  // `# head=helmet,id=123`. Keep the raw line for the UI/parser, but remove
  // only its comment marker when emitting a profileset override.
  const rawLine = item.rawDefinition.trim().replace(/^#\s*/, "");
  const match = rawLine.match(/^[a-z0-9_]+\s*=\s*(.+)$/i);
  if (!match || !match[1].trim()) throw new Error("Candidate item is missing its SimulationCraft definition.");
  return match[1].trim();
}

/** Builds one profileset run: the source profile is the baseline and each candidate overrides one slot. */
export function createGearCompareInput(
  simcText: string,
  slot: EquipmentSlot,
  candidates: GearItem[],
  settings: Required<SimulationSettings>,
): string {
  if (!candidates.length) throw new Error("Select at least one candidate item to compare.");
  const profile = simcText.replace(/^\uFEFF/, "").trim();
  if (!profile) throw new Error("Paste a SimulationCraft profile before starting a comparison.");
  const profilesets = candidates.map((candidate, index) =>
    `profileset."LocalCraft Candidate ${index + 1}"+=${slot}=${itemDefinition(candidate, slot)}`,
  );
  return `${profile}\n\n# LocalCraft gear comparison\niterations=${settings.iterations}\nfight_style=${settings.fightStyle}\ndesired_targets=${settings.desiredTargets}\nmax_time=${settings.maxTime}\n${profilesets.join("\n")}\njson2=/work/result.json\n`;
}
