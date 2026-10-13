import test from "node:test";
import assert from "node:assert/strict";
import { boardTemplates, getBoardTemplate } from "../data/boardTemplates.js";

test("every gallery template has a usable board structure", () => {
  assert.equal(Object.keys(boardTemplates).length, 51);

  for (const [key, lists] of Object.entries(boardTemplates)) {
    assert.ok(lists.length >= 4, `${key} should include at least four lists`);
    for (const list of lists) {
      assert.ok(list.title.length > 0 && list.title.length <= 120, `${key} has an invalid list title`);
      assert.ok(list.cards.length > 0, `${key}/${list.title} should include starter cards`);
      assert.ok(list.cards.every((title) => title.length > 0 && title.length <= 255), `${key}/${list.title} has an invalid card title`);
    }
  }
});

test("template lookup normalizes keys and rejects unknown templates", () => {
  assert.equal(getBoardTemplate(" Sprint-Planning "), boardTemplates["sprint-planning"]);
  assert.equal(getBoardTemplate("not-a-template"), null);
});
