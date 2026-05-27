const { readState, writeState } = require("../lib/storage");
const { createPlan, getTodayTask } = require("./plan");
const { reviewPractice } = require("./review");

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function recomputeStats(state) {
  const tasks = state.activePlan?.tasks || [];
  const dayMap = new Map();

  for (const task of tasks) {
    if (!dayMap.has(task.day)) dayMap.set(task.day, []);
    dayMap.get(task.day).push(task);
  }

  let completedDays = 0;
  let completedTasks = 0;
  let totalMinutes = 0;

  for (const dayTasks of dayMap.values()) {
    const done = dayTasks.every(t => t.status === "completed" || t.status === "reviewed");
    if (done && dayTasks.length) completedDays += 1;
    for (const task of dayTasks) {
      if (task.status === "completed" || task.status === "reviewed") {
        completedTasks += 1;
        totalMinutes += task.minutes || 0;
      }
    }
  }

  state.stats = {
    ...state.stats,
    completedDays,
    completedTasks,
    totalMinutes
  };
}

function touchActivity(state) {
  const today = todayKey();
  const last = state.stats.lastActiveDate;
  if (!last) {
    state.stats.streak = 1;
  } else if (last === today) {
    // same day, keep streak
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    state.stats.streak = last === yKey ? (state.stats.streak || 0) + 1 : 1;
  }
  state.stats.lastActiveDate = today;
}

function getState() {
  return readState();
}

function saveProfile(profile) {
  const state = readState();
  state.profile = {
    ...state.profile,
    level: profile.level || state.profile.level,
    goal: profile.goal || state.profile.goal,
    minutes: Number(profile.minutes) || state.profile.minutes,
    weakAreas: Array.isArray(profile.weakAreas) ? profile.weakAreas : state.profile.weakAreas,
    scenario: profile.scenario || state.profile.scenario
  };
  writeState(state);
  return state.profile;
}

function savePlan(planInput) {
  const state = readState();
  const result = createPlan({ ...state.profile, ...planInput });
  state.activePlan = result.activePlan;
  recomputeStats(state);
  writeState(state);
  return result;
}

function updateTask(taskId, { action, reflection = "" } = {}) {
  const state = readState();
  if (!state.activePlan) {
    return { error: "No active plan" };
  }

  const task = state.activePlan.tasks.find(t => t.id === taskId);
  if (!task) {
    return { error: "Task not found" };
  }

  const now = new Date().toISOString();

  if (action === "start") {
    task.status = "in_progress";
  } else if (action === "complete") {
    task.status = "completed";
    task.completedAt = now;
  } else if (action === "reflect") {
    task.reflection = String(reflection || "").trim();
    task.status = "reviewed";
    if (!task.completedAt) task.completedAt = now;
  } else {
    return { error: "Invalid action" };
  }

  touchActivity(state);
  recomputeStats(state);
  writeState(state);

  return { task, stats: state.stats, todayTask: getTodayTask(state) };
}

function saveSubmission({ taskId, type, focus, text, reviewResult }) {
  const state = readState();
  const submission = {
    id: `sub_${Date.now()}`,
    taskId: taskId || null,
    type: type || "综合",
    focus: focus || "",
    textPreview: String(text || "").slice(0, 200),
    score: reviewResult.score,
    summary: reviewResult.summary,
    createdAt: new Date().toISOString()
  };
  state.submissions.unshift(submission);
  if (state.submissions.length > 100) state.submissions.length = 100;

  touchActivity(state);
  writeState(state);
  return submission;
}

function reviewAndSave(body) {
  const reviewResult = reviewPractice(body);
  if (body.text && body.text.trim()) {
    saveSubmission({
      taskId: body.taskId,
      type: body.type,
      focus: body.focus,
      text: body.text,
      reviewResult
    });
  }
  return reviewResult;
}

function getPublicState() {
  const state = readState();
  const totalTasks = state.activePlan?.tasks?.length || 0;
  const progress = totalTasks
    ? Math.round(((state.stats.completedTasks || 0) / totalTasks) * 100)
    : 0;

  return {
    profile: state.profile,
    activePlan: state.activePlan,
    stats: state.stats,
    progress,
    todayTask: getTodayTask(state),
    submissions: state.submissions.slice(0, 20)
  };
}

module.exports = {
  getState,
  getPublicState,
  saveProfile,
  savePlan,
  updateTask,
  reviewAndSave,
  getTodayTask,
  recomputeStats
};
