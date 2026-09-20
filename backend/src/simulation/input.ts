import { EQUIPMENT_SLOTS, type EquipmentSlot, type GearCompareAdjustments, type GearItem, type SimulationSettings } from "@localcraft/shared";

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

function positiveId(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < 1) throw new Error(`${label} must be a positive whole-number ID.`);
  return value as number;
}

function normalizeAdjustments(adjustments?: GearCompareAdjustments): GearCompareAdjustments {
  const gemId = positiveId(adjustments?.emptySocketGemId, "Gem");
  const enchantments = Object.fromEntries(Object.entries(adjustments?.enchantments ?? {}).map(([slot, id]) => {
    if (!/^[a-z0-9_]+$/i.test(slot)) throw new Error("Enchant slot is invalid.");
    return [slot, positiveId(id, "Enchant")];
  }).filter(([, id]) => id !== undefined)) as Partial<Record<EquipmentSlot, number>>;
  return { ...(Object.keys(enchantments).length ? { enchantments } : {}), ...(gemId ? { emptySocketGemId: gemId } : {}) };
}

function withAdjustments(definition: string, slot: EquipmentSlot, adjustments: GearCompareAdjustments): string {
  let adjusted = definition;
  const enchantId = adjustments.enchantments?.[slot];
  if (enchantId) adjusted = /,(?:enchant_id|enchant)=[^,]*/i.test(adjusted)
    ? adjusted.replace(/,(?:enchant_id|enchant)=[^,]*/i, `,enchant_id=${enchantId}`)
    : `${adjusted},enchant_id=${enchantId}`;

  // A gem is supplied only for socket positions SimC explicitly marks as empty (0).
  // We do not add a gem_id field when the source item exposes no socket information.
  if (adjustments.emptySocketGemId && /,gem_id=[0-9/]*0[0-9/]*/i.test(adjusted)) {
    adjusted = adjusted.replace(/,gem_id=([0-9/]+)/i, (_match, gems: string) =>
      `,gem_id=${gems.split("/").map((gem) => gem === "0" ? String(adjustments.emptySocketGemId) : gem).join("/")}`);
  }
  return adjusted;
}

function profileWithAdjustments(simcText: string, adjustments: GearCompareAdjustments): string {
  if (!adjustments.enchantments && !adjustments.emptySocketGemId) return simcText;
  return simcText.split(/\r?\n/).map((line) => {
    const match = line.match(/^\s*([a-z0-9_]+)\s*=\s*(.+?)\s*$/i);
    if (!match) return line;
    const slot = match[1].toLowerCase() as EquipmentSlot;
    return EQUIPMENT_SLOTS.includes(slot) && (adjustments.enchantments?.[slot] || adjustments.emptySocketGemId)
      ? `${match[1]}=${withAdjustments(match[2], slot, adjustments)}` : line;
  }).join("\n");
}

/** Builds one profileset run: the source profile is the baseline and each candidate overrides one slot. */
export function createGearCompareInput(
  simcText: string,
  slot: EquipmentSlot,
  candidates: GearItem[],
  settings: Required<SimulationSettings>,
  adjustments?: GearCompareAdjustments,
): string {
  if (!candidates.length) throw new Error("Select at least one candidate item to compare.");
  const normalizedAdjustments = normalizeAdjustments(adjustments);
  const profile = profileWithAdjustments(simcText.replace(/^\uFEFF/, "").trim(), normalizedAdjustments);
  if (!profile) throw new Error("Paste a SimulationCraft profile before starting a comparison.");
  const profilesets = candidates.flatMap((candidate, index) => {
    const name = `profileset."LocalCraft Candidate ${index + 1}"`;
    const overrides = [`${name}+=${slot}=${withAdjustments(itemDefinition(candidate, slot), slot, normalizedAdjustments)}`];

    // A profileset starts from the complete baseline profile. Unlike equipping
    // an item in-game, overriding main_hand does not implicitly clear its
    // existing off_hand, so make that removal explicit for two-handed items.
    if (slot === "main_hand" && candidate.isTwoHanded) overrides.push(`${name}+=off_hand=none`);
    return overrides;
  });
  return `${profile}\n\n# LocalCraft gear comparison\niterations=${settings.iterations}\nfight_style=${settings.fightStyle}\ndesired_targets=${settings.desiredTargets}\nmax_time=${settings.maxTime}\n${profilesets.join("\n")}\njson2=/work/result.json\n`;
}
