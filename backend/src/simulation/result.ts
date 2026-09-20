import type { DamageBreakdownEntry, QuickSimResult } from "@localcraft/shared";
import type { RawSimulationResult } from "./docker-engine.js";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function firstPlayer(raw: RawSimulationResult): JsonRecord {
  const simulation = record(raw.sim) ?? raw;
  const players = simulation.players;
  if (!Array.isArray(players) || !record(players[0])) {
    throw new Error("SimulationCraft JSON did not include a player result.");
  }
  return players[0] as JsonRecord;
}

function resultNumber(container: JsonRecord | undefined, key: string): number | undefined {
  const direct = number(container?.[key]);
  if (direct !== undefined) return direct;
  return number(record(container?.[key])?.mean);
}

function damageBreakdown(player: JsonRecord): DamageBreakdownEntry[] {
  const collectedData = record(player.collected_data);
  const totalDamage = resultNumber(collectedData, "damage");
  const stats = Array.isArray(player.stats) ? player.stats : [];
  const entries = stats.flatMap((stat) => {
    const action = record(stat);
    const name = text(action?.name);
    const damage = number(action?.actual_amount) ?? number(action?.compound_amount) ?? number(action?.total_amount);
    if (!name || damage === undefined || damage <= 0) return [];
    return [{ name, damage, percentage: totalDamage && totalDamage > 0 ? damage / totalDamage * 100 : 0 }];
  });

  const calculatedTotal = entries.reduce((sum, entry) => sum + entry.damage, 0);
  return entries
    .map((entry) => ({
      ...entry,
      percentage: Number((entry.percentage || entry.damage / calculatedTotal * 100).toFixed(4)),
    }))
    .sort((left, right) => right.damage - left.damage);
}

/** Converts SimulationCraft's deliberately expansive json2 document into UI data. */
export function parseQuickSimResult(raw: RawSimulationResult): QuickSimResult {
  const player = firstPlayer(raw);
  const collectedData = record(player.collected_data);
  const simulation = record(raw.sim) ?? raw;
  const dps = resultNumber(collectedData, "dps");
  if (dps === undefined) throw new Error("SimulationCraft JSON did not include DPS for the player.");

  const duration = resultNumber(record(simulation.simulation_length), "mean")
    ?? resultNumber(simulation, "simulation_length")
    ?? resultNumber(simulation, "max_time");

  return {
    characterName: text(player.name),
    specialization: text(player.specialization) ?? text(player.spec),
    dps,
    dpsError: resultNumber(collectedData, "dps_error") ?? resultNumber(collectedData, "dps_error_pct"),
    durationSeconds: duration,
    damageBreakdown: damageBreakdown(player),
  };
}
