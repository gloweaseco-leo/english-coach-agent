const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createPlan, countWeakAreaTasks } = require("../server/services/plan");

test("createPlan generates requested number of days", () => {
  const result = createPlan({ days: 14, level: "B1", goal: "test", minutes: 45 });
  assert.equal(result.activePlan.tasks.length, 14);
  assert.equal(result.days.length, 14);
  assert.match(result.overview, /14 天计划/);
});

test("createPlan tasks have required fields", () => {
  const result = createPlan({ days: 7, weakAreas: ["listening"] });
  for (const task of result.activePlan.tasks) {
    assert.ok(task.id.startsWith("task_"));
    assert.ok(task.day >= 1);
    assert.ok(task.title);
    assert.ok(task.chapter);
    assert.ok(Array.isArray(task.instructions) && task.instructions.length >= 3);
    assert.ok(task.outputRequirement);
    assert.equal(task.status, "not_started");
  }
});

test("weakAreas increases task distribution for selected tracks", () => {
  const withWeak = createPlan({ days: 14, weakAreas: ["listening", "speaking"] });
  const withoutWeak = createPlan({ days: 14, weakAreas: [] });
  const weakCounts = countWeakAreaTasks(withWeak.activePlan.tasks, ["listening", "speaking"]);
  const neutralCounts = countWeakAreaTasks(withoutWeak.activePlan.tasks, ["listening", "speaking"]);
  const weakTotal = weakCounts.listening + weakCounts.speaking;
  const neutralTotal = neutralCounts.listening + neutralCounts.speaking;
  assert.ok(weakTotal > neutralTotal);
});

test("every 7th day is a review task", () => {
  const result = createPlan({ days: 14 });
  const day7 = result.activePlan.tasks.find(t => t.day === 7);
  const day14 = result.activePlan.tasks.find(t => t.day === 14);
  assert.equal(day7.kind, "review");
  assert.equal(day14.kind, "review");
});

test("every 3rd day is an output task (non-review days)", () => {
  const result = createPlan({ days: 12 });
  const day3 = result.activePlan.tasks.find(t => t.day === 3);
  assert.equal(day3.kind, "output");
});
