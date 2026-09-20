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
