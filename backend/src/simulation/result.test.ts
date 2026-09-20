import assert from "node:assert/strict";
import test from "node:test";
import { parseGearCompareResult, parseQuickSimResult } from "./result.js";

test("parses a json2 player result into the Quick Sim model", () => {
  const result = parseQuickSimResult({
    sim: {
      simulation_length: { mean: 287.4 },
      players: [{
        name: "Khadgar", specialization: "Fire", collected_data: {
          dps: { mean: 1_820_907 }, dps_error: 2_510, damage: { mean: 522_000_000 },
        },
        stats: [
          { name: "Pyroblast", actual_amount: 137_808_000 },
          { name: "Ignite", actual_amount: 104_400_000 },
          { name: "No damage" },
        ],
      }],
    },
  });

  assert.equal(result.dps, 1_820_907);
  assert.equal(result.dpsError, 2_510);
  assert.equal(result.durationSeconds, 287.4);
  assert.deepEqual(result.damageBreakdown[0], { name: "Pyroblast", damage: 137_808_000, percentage: 26.4 });
});

test("parses baseline and profileset DPS into sorted comparison entries", () => {
  const item = (id: number) => ({ slot: "head" as const, itemId: id, rawDefinition: `head=item,id=${id}` });
  const result = parseGearCompareResult({ sim: { players: [
    { collected_data: { dps: { mean: 100 } } },
  ], profilesets: { results: [
    { name: "LocalCraft Candidate 1", mean: 110, mean_stddev: 2 },
    { name: "LocalCraft Candidate 2", mean: 90 },
  ] } } }, item(1), [item(2), item(3)]);
  assert.equal(result.baseline.dps, 100);
  assert.equal(result.candidates[0].difference, 10);
  assert.equal(result.candidates[0].percentageDifference, 10);
  assert.equal(result.candidates[1].difference, -10);
});

test("rejects json2 documents without a player DPS result", () => {
  assert.throws(() => parseQuickSimResult({ sim: { players: [{}] } }), /DPS/);
});
