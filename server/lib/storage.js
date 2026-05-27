const fs = require("fs");
const path = require("path");
const { DATA_ROOT, VERSION } = require("./config");

const STATE_FILE = "learning-state.json";

function getStatePath(dataRoot = DATA_ROOT) {
  return path.join(dataRoot, STATE_FILE);
}

function defaultState() {
  return {
    version: VERSION,
    profile: {
      level: "B1",
      goal: "提升听说读写综合能力",
      minutes: 45,
      weakAreas: [],
      scenario: "daily"
    },
    activePlan: null,
    submissions: [],
    stats: {
      completedDays: 0,
      completedTasks: 0,
      totalMinutes: 0,
      streak: 0,
      lastActiveDate: null
    }
  };
}

function ensureDataDir(dataRoot = DATA_ROOT) {
  try {
    if (!fs.existsSync(dataRoot)) {
      fs.mkdirSync(dataRoot, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

function readState(dataRoot = DATA_ROOT) {
  ensureDataDir(dataRoot);
  const filePath = getStatePath(dataRoot);
  try {
    if (!fs.existsSync(filePath)) {
      const state = defaultState();
      writeState(state, dataRoot);
      return state;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed, profile: { ...defaultState().profile, ...parsed.profile }, stats: { ...defaultState().stats, ...parsed.stats } };
  } catch (error) {
    console.error("Failed to read learning state:", error.message);
    return defaultState();
  }
}

function writeState(state, dataRoot = DATA_ROOT) {
  ensureDataDir(dataRoot);
  const filePath = getStatePath(dataRoot);
  try {
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(tmp, filePath);
    return true;
  } catch (error) {
    console.error("Failed to write learning state:", error.message);
    return false;
  }
}

function dataRootExists(dataRoot = DATA_ROOT) {
  return fs.existsSync(dataRoot);
}

module.exports = {
  STATE_FILE,
  getStatePath,
  defaultState,
  ensureDataDir,
  readState,
  writeState,
  dataRootExists
};
