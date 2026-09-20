export const EQUIPMENT_SLOTS = [
  "head", "neck", "shoulder", "back", "chest", "wrist", "hands", "waist",
  "legs", "feet", "finger1", "finger2", "trinket1", "trinket2", "main_hand", "off_hand",
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export interface GearItem {
  slot: EquipmentSlot;
  itemId?: number;
  name?: string;
  itemLevel?: number;
  enchantId?: number;
  gemIds?: number[];
  /** Present when the SimC declaration explicitly identifies a two-handed weapon. */
  isTwoHanded?: boolean;
  rawDefinition: string;
}

export interface ParsedProfile {
  characterName?: string;
  characterClass?: string;
  specialization?: string;
  talents?: string;
  equippedGear: GearItem[];
  bagItems: GearItem[];
}

export interface ParseProfileRequest {
  simcText: string;
}

export interface SimulationSettings {
  iterations: number;
  fightStyle: string;
  desiredTargets?: number;
  maxTime?: number;
}

export const SIMULATION_FIGHT_STYLES = [
  "Patchwerk",
  "HecticAddCleave",
  "LightMovement",
  "HeavyMovement",
  "Beastlord",
  "DungeonSlice",
  "Ultraxion",
] as const;

export type SimulationFightStyle = (typeof SIMULATION_FIGHT_STYLES)[number];

export interface DamageBreakdownEntry {
  name: string;
  damage: number;
  percentage: number;
}

export interface QuickSimResult {
  characterName?: string;
  specialization?: string;
  dps: number;
  dpsError?: number;
  durationSeconds?: number;
  damageBreakdown: DamageBreakdownEntry[];
}

export interface QuickSimRequest {
  simcText: string;
  settings?: Partial<SimulationSettings>;
}

export interface GearCompareRequest {
  simcText: string;
  slot: EquipmentSlot;
  candidateItems: GearItem[];
  settings?: Partial<SimulationSettings>;
  adjustments?: GearCompareAdjustments;
}

/** Optional, simulation-only item changes. The pasted profile is never modified. */
export interface GearCompareAdjustments {
  enchantments?: Partial<Record<EquipmentSlot, number>>;
  emptySocketGemId?: number;
}

export interface GearComparisonEntry {
  item: GearItem;
  dps: number;
  dpsError?: number;
  difference: number;
  percentageDifference: number;
}

export interface GearCompareResult {
  baseline: { item: GearItem; dps: number; dpsError?: number };
  candidates: GearComparisonEntry[];
}
