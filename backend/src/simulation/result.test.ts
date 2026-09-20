import assert from "node:assert/strict";
import test from "node:test";
import { parseQuickSimResult } from "./result.js";

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

test("rejects json2 documents without a player DPS result", () => {
  assert.throws(() => parseQuickSimResult({ sim: { players: [{}] } }), /DPS/);
});
