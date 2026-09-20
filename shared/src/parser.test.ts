import assert from "node:assert/strict";
import test from "node:test";
import { parseSimcProfile } from "./parser.js";

test("parses player metadata and equipped gear", () => {
  const profile = parseSimcProfile(`warlock=Test_Lock\nspec=destruction\ntalents=CAA\nhead=example_helm,id=123,ilevel=700\nfinger1=ring,id=456`);
  assert.equal(profile.characterName, "Test Lock");
  assert.equal(profile.characterClass, "warlock");
  assert.equal(profile.specialization, "destruction");
  assert.equal(profile.equippedGear[0].itemId, 123);
  assert.equal(profile.equippedGear[0].itemLevel, 700);
});

test("keeps commented alternate gear as bag items", () => {
  const profile = parseSimcProfile("# head=alternate_helm,id=999,ilevel=710");
  assert.equal(profile.bagItems.length, 1);
  assert.equal(profile.bagItems[0].name, "alternate helm");
});

test("identifies two-handed weapon declarations", () => {
  const profile = parseSimcProfile("# main_hand=umbral_spire,id=258514,weapon=staff2h_3.6speed");
  assert.equal(profile.bagItems[0].isTwoHanded, true);
});

test("uses the addon's preceding comment for compact item names and levels", () => {
  const profile = parseSimcProfile(`warlock=Test_Lock
# Crown of Arcane Acuity (723)
head=,id=271546,bonus_id=123
# Vile Vial of Volatile Venom (308)
# trinket1=,id=273796,bonus_id=456`);

  assert.deepEqual(profile.equippedGear[0], {
    slot: "head",
    itemId: 271546,
    itemLevel: 723,
    name: "Crown of Arcane Acuity",
    rawDefinition: "head=,id=271546,bonus_id=123",
  });
  assert.equal(profile.bagItems[0].name, "Vile Vial of Volatile Venom");
  assert.equal(profile.bagItems[0].itemLevel, 308);
});
