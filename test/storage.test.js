const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { readState, writeState, defaultState, getStatePath } = require("../server/lib/storage");

test("storage creates default state when file missing", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "coach-data-"));
  const state = readState(tmp);
  assert.equal(state.version, "0.3.0");
  assert.equal(state.profile.level, "B1");
  assert.ok(fs.existsSync(getStatePath(tmp)));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("storage write and read roundtrip", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "coach-data-"));
  const initial = defaultState();
  initial.profile.goal = "测试目标";
  writeState(initial, tmp);
  const loaded = readState(tmp);
  assert.equal(loaded.profile.goal, "测试目标");
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("storage tolerates corrupt json", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "coach-data-"));
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(getStatePath(tmp), "{not valid", "utf8");
  const state = readState(tmp);
  assert.equal(state.profile.level, "B1");
  fs.rmSync(tmp, { recursive: true, force: true });
});
