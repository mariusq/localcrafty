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

test("two-handed main-hand candidates clear the baseline off-hand", () => {
  const input = createGearCompareInput(
    "mage=Khadgar\nmain_hand=wand,id=1\noff_hand=focus,id=2",
    "main_hand",
    [{ slot: "main_hand", name: "Staff", isTwoHanded: true, rawDefinition: "# main_hand=staff,id=3" }],
    defaultSimulationSettings,
  );
  assert.match(input, /profileset\."LocalCraft Candidate 1"\+=main_hand=staff,id=3/);
  assert.match(input, /profileset\."LocalCraft Candidate 1"\+=off_hand=none/);
});

test("one-handed main-hand candidates keep the baseline off-hand", () => {
  const input = createGearCompareInput(
    "mage=Khadgar\nmain_hand=wand,id=1\noff_hand=focus,id=2",
    "main_hand",
    [{ slot: "main_hand", name: "Dagger", rawDefinition: "# main_hand=dagger,id=3" }],
    defaultSimulationSettings,
  );
  assert.doesNotMatch(input, /off_hand=none/);
});

test("settings apply defaults and reject unsafe fight styles", () => {
  assert.deepEqual(normalizeSimulationSettings({ iterations: 500 }), { ...defaultSimulationSettings, iterations: 500 });
  assert.throws(() => normalizeSimulationSettings({ fightStyle: "Patchwerk\njson2=elsewhere" }), /unsupported characters/);
});

test("gear adjustments replace enchants and fill only explicit empty gem sockets", () => {
  const input = createGearCompareInput("mage=Khadgar\nhead=old,id=1,gem_id=0/123\nfinger1=ring,id=3,enchant_id=5", "head", [{ slot: "head", rawDefinition: "# head=new,id=2,gem_id=0/0" }], defaultSimulationSettings, { enchantments: { finger1: 99 }, emptySocketGemId: 456 });
  assert.match(input, /head=old,id=1,gem_id=456\/123/);
  assert.match(input, /finger1=ring,id=3,enchant_id=99/);
  assert.match(input, /profileset\..*head=new,id=2,gem_id=456\/456/);
});
