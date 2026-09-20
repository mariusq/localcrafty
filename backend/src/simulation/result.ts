import type { DamageBreakdownEntry, GearCompareResult, GearItem, QuickSimResult } from "@localcraft/shared";
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

function players(raw: RawSimulationResult): JsonRecord[] {
  const simulation = record(raw.sim) ?? raw;
  return Array.isArray(simulation.players) ? simulation.players.flatMap((player) => record(player) ? [player] : []) : [];
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

function playerDps(player: JsonRecord): { dps: number; dpsError?: number } {
  const collectedData = record(player.collected_data);
  const dps = resultNumber(collectedData, "dps");
  if (dps === undefined) throw new Error("SimulationCraft JSON did not include DPS for a comparison profile.");
  const dpsError = resultNumber(collectedData, "dps_error") ?? resultNumber(collectedData, "dps_error_pct");
  return { dps, ...(dpsError === undefined ? {} : { dpsError }) };
}

function profilesetDps(raw: RawSimulationResult, candidates: GearItem[]): Array<{ dps: number; dpsError?: number }> | undefined {
  const simulation = record(raw.sim) ?? raw;
  const profilesets = record(simulation.profilesets);
  const results = Array.isArray(profilesets?.results) ? profilesets.results.flatMap((entry) => record(entry) ? [entry] : []) : [];
  if (!results.length) return undefined;

  return candidates.map((_, index) => {
    const expectedName = `LocalCraft Candidate ${index + 1}`;
    const entry = results.find((result) => text(result.name) === expectedName);
    const dps = resultNumber(entry, "mean");
    if (dps === undefined) throw new Error(`SimulationCraft did not return DPS for ${expectedName}.`);
    const dpsError = resultNumber(entry, "mean_stddev") ?? resultNumber(entry, "stddev");
    return { dps, ...(dpsError === undefined ? {} : { dpsError }) };
  });
}

/** Maps the source player and ordered LocalCraft profilesets into a compact comparison response. */
export function parseGearCompareResult(raw: RawSimulationResult, baselineItem: GearItem, candidates: GearItem[]): GearCompareResult {
  const baseline = playerDps(firstPlayer(raw));
  // Profilesets do not add simulated clones to sim.players. json2 places their
  // compact metric summaries in sim.profilesets.results instead.
  const profilesetResults = profilesetDps(raw, candidates);
  const candidateResults = profilesetResults ?? players(raw).slice(1).map(playerDps);
  if (candidateResults.length < candidates.length) throw new Error("SimulationCraft did not return results for every comparison profile.");
  return {
    baseline: { item: baselineItem, ...baseline },
    candidates: candidates.map((item, index) => {
      const result = candidateResults[index];
      const difference = result.dps - baseline.dps;
      return { item, ...result, difference, percentageDifference: baseline.dps ? difference / baseline.dps * 100 : 0 };
    }).sort((left, right) => right.dps - left.dps),
  };
}
