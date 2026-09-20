import assert from "node:assert/strict";
import test from "node:test";
import { createGearCompareInput, createQuickSimInput, defaultSimulationSettings, normalizeSimulationSettings } from "./input.js";

test("quick sim input retains the source profile and appends LocalCraft settings", () => {
  const input = createQuickSimInput("mage=Khadgar\nspec=fire", defaultSimulationSettings);
  assert.match(input, /^mage=Khadgar/m);
  assert.match(input, /iterations=10000/);
  assert.match(input, /json2=\/work\/result.json/);
});

test("gear compare creates profilesets that override only the selected slot", () => {
  const input = createGearCompareInput("mage=Khadgar\nhead=old,id=1", "head", [{ slot: "head", name: "New", rawDefinition: "# head=new,id=2" }], defaultSimulationSettings);
  assert.match(input, /profileset\."LocalCraft Candidate 1"\+=head=new,id=2/);
  assert.match(input, /json2=\/work\/result.json/);
});

test("settings apply defaults and reject unsafe fight styles", () => {
  assert.deepEqual(normalizeSimulationSettings({ iterations: 500 }), { ...defaultSimulationSettings, iterations: 500 });
  assert.throws(() => normalizeSimulationSettings({ fightStyle: "Patchwerk\njson2=elsewhere" }), /unsupported characters/);
});
