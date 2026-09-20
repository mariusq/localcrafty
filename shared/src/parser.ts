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

interface ItemAnnotation {
  name: string;
  itemLevel: number;
}

function parseItemAnnotation(line: string): ItemAnnotation | undefined {
  // The SimulationCraft addon writes bag items in this compact form:
  //   # Vile Vial of Volatile Venom (308)
  //   # trinket1=,id=273796,...
  // The name and equipped item level are therefore not part of the item line.
  const match = line.match(/^\s*#\s*(.+?)\s*\((\d+)\)\s*$/);
  if (!match || match[1].includes("=")) return undefined;

  return { name: match[1].trim(), itemLevel: Number(match[2]) };
}

function applyAnnotation(item: GearItem, annotation: ItemAnnotation | undefined): GearItem {
  if (!annotation) return item;

  return {
    ...item,
    // The annotation is the addon's human-readable, authoritative display data.
    // Keep explicit fields from a normal SimC definition when they are available.
    ...(item.name ? {} : { name: annotation.name }),
    ...(item.itemLevel ? {} : { itemLevel: annotation.itemLevel }),
  };
}

export function parseSimcProfile(simcText: string): ParsedProfile {
  const result: ParsedProfile = { equippedGear: [], bagItems: [] };
  const lines = simcText.replace(/^\uFEFF/, "").split(/\r?\n/);
  let pendingItemAnnotation: ItemAnnotation | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const annotation = parseItemAnnotation(trimmed);
    if (annotation) {
      pendingItemAnnotation = annotation;
      continue;
    }

    const player = trimmed.match(/^([a-z_]+)\s*=\s*([^,\s]+)(?:\s|$)/i);
    if (!result.characterName && player && !trimmed.startsWith("#") && !equipmentSlots.has(player[1].toLowerCase())) {
      result.characterClass = player[1].toLowerCase();
      result.characterName = player[2].replace(/^['"]|['"]$/g, "").replace(/_/g, " ");
      continue;
    }

    const gear = parseGearLine(trimmed);
    if (gear) {
      result.equippedGear.push(applyAnnotation(gear, pendingItemAnnotation));
      pendingItemAnnotation = undefined;
      continue;
    }

    const bagItem = parseBagItem(trimmed);
    if (bagItem) {
      result.bagItems.push(applyAnnotation(bagItem, pendingItemAnnotation));
      pendingItemAnnotation = undefined;
      continue;
    }

    const spec = trimmed.match(/^spec\s*=\s*(.+)$/i);
    if (spec) result.specialization = spec[1].trim().replace(/_/g, " ");
    const talents = trimmed.match(/^talents\s*=\s*(.+)$/i);
    if (talents) result.talents = talents[1].trim();
  }

  return result;
}
