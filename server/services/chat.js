const { contentRootExists } = require("./content");
const { search, toReferences } = require("./retrieval");
const { readState } = require("../lib/storage");
const { getTodayTask } = require("./progress");
const { chatWithFallback, getProviderStatus } = require("./providers");
const { RAG_TOP_K } = require("../lib/config");

async function handleChat(message, profileOverride = {}) {
  const state = readState();
  const profile = { ...state.profile, ...profileOverride };
  const todayTask = getTodayTask(state);
  const contentAvailable = contentRootExists();

  const todayTrack = todayTask?.task?.track || "";
  const references = contentAvailable
    ? toReferences(search(String(message || ""), {
      topK: RAG_TOP_K,
      weakAreas: profile.weakAreas || [],
      todayTrack
    }))
    : [];

  const ctx = {
    message: String(message || ""),
    profile,
    state,
    todayTask,
    references,
    contentAvailable
  };

  const { reply, usage, provider, fallbackUsed, providerWarning } = await chatWithFallback(ctx);

  const result = {
    reply,
    references,
    provider,
    mode: "rag",
    fallbackUsed: Boolean(fallbackUsed),
    focus: undefined
  };

  if (providerWarning) result.providerWarning = providerWarning;
  if (todayTask?.status === "active" && todayTask.task) {
    result.todayTask = todayTask.task;
  }
  if (usage) result.usage = usage;

  if (!contentAvailable) {
    result.contentWarning = "本地指南未加载，回答未基于章节原文";
  }

  return result;
}

module.exports = { handleChat };
