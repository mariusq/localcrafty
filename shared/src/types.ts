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

export interface QuickSimRequest {
  simcText: string;
  settings?: Partial<SimulationSettings>;
}
