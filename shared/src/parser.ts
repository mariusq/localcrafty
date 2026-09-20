import { EQUIPMENT_SLOTS, type EquipmentSlot, type GearItem, type ParsedProfile } from "./types.js";

const equipmentSlots = new Set<string>(EQUIPMENT_SLOTS);

function valueFromLine(line: string): string | undefined {
  const separator = line.indexOf("=");
  return separator === -1 ? undefined : line.slice(separator + 1).trim() || undefined;
}

function parseGearLine(line: string): GearItem | undefined {
  const match = line.match(/^\s*([a-z0-9_]+)\s*=\s*(.+?)\s*$/i);
  if (!match) return undefined;

  const slot = match[1].toLowerCase();
  if (!equipmentSlots.has(slot)) return undefined;

  const definition = match[2];
  const itemId = definition.match(/(?:^|,)id=(\d+)/i)?.[1];
  const itemLevel = definition.match(/(?:^|,)ilevel=(\d+)/i)?.[1];
  const name = definition.split(",")[0].replace(/_/g, " ").trim();

  return {
    slot: slot as EquipmentSlot,
    ...(itemId ? { itemId: Number(itemId) } : {}),
    ...(itemLevel ? { itemLevel: Number(itemLevel) } : {}),
    ...(name ? { name } : {}),
    rawDefinition: line.trim(),
  };
}

function parseBagItem(line: string): GearItem | undefined {
  const match = line.match(/^\s*#\s*([a-z0-9_]+)\s*=\s*(.+?)\s*$/i);
  if (!match || !equipmentSlots.has(match[1].toLowerCase())) return undefined;
  const item = parseGearLine(`${match[1]}=${match[2]}`);
  return item ? { ...item, rawDefinition: line.trim() } : undefined;
}

export function parseSimcProfile(simcText: string): ParsedProfile {
  const result: ParsedProfile = { equippedGear: [], bagItems: [] };
  const lines = simcText.replace(/^\uFEFF/, "").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const player = trimmed.match(/^([a-z_]+)\s*=\s*([^,\s]+)(?:\s|$)/i);
    if (!result.characterName && player && !trimmed.startsWith("#") && !equipmentSlots.has(player[1].toLowerCase())) {
      result.characterClass = player[1].toLowerCase();
      result.characterName = player[2].replace(/^['"]|['"]$/g, "").replace(/_/g, " ");
      continue;
    }

    const gear = parseGearLine(trimmed);
    if (gear) {
      result.equippedGear.push(gear);
      continue;
    }

    const bagItem = parseBagItem(trimmed);
    if (bagItem) {
      result.bagItems.push(bagItem);
      continue;
    }

    const spec = trimmed.match(/^spec\s*=\s*(.+)$/i);
    if (spec) result.specialization = spec[1].trim().replace(/_/g, " ");
    const talents = trimmed.match(/^talents\s*=\s*(.+)$/i);
    if (talents) result.talents = talents[1].trim();
  }

  return result;
}
