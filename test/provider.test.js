const { test } = require("node:test");
const assert = require("node:assert/strict");

test("COACH_MODE=local selects LocalRuleProvider", async () => {
  const original = process.env.COACH_MODE;
  process.env.COACH_MODE = "local";
  delete require.cache[require.resolve("../server/lib/config")];
  delete require.cache[require.resolve("../server/services/providers/index")];
  const { getConfiguredMode, createProvider } = require("../server/services/providers/index");
  assert.equal(getConfiguredMode(), "local");
  assert.equal(createProvider().name, "local");
  process.env.COACH_MODE = original;
});

test("openai without API key has providerReady=false", () => {
  const originalMode = process.env.COACH_MODE;
  const originalKey = process.env.OPENAI_COMPATIBLE_API_KEY;
  process.env.COACH_MODE = "openai";
  process.env.OPENAI_COMPATIBLE_API_KEY = "";
  delete require.cache[require.resolve("../server/lib/config")];
  delete require.cache[require.resolve("../server/services/providers/openaiCompatibleProvider")];
  delete require.cache[require.resolve("../server/services/providers/index")];
  const { getProviderStatus } = require("../server/services/providers/index");
  const status = getProviderStatus();
  assert.equal(status.coachMode, "openai");
  assert.equal(status.providerReady, false);
  assert.match(status.providerWarning, /API_KEY/);
  process.env.COACH_MODE = originalMode;
  process.env.OPENAI_COMPATIBLE_API_KEY = originalKey;
});

test("provider failure falls back to LocalRuleProvider", async () => {
  const originalMode = process.env.COACH_MODE;
  process.env.COACH_MODE = "openai";
  process.env.OPENAI_COMPATIBLE_API_KEY = "test-key-should-fail";
  delete require.cache[require.resolve("../server/lib/config")];
  delete require.cache[require.resolve("../server/services/providers/index")];
  delete require.cache[require.resolve("../server/services/providers/openaiCompatibleProvider")];

  const openaiModule = require("../server/services/providers/openaiCompatibleProvider");
  const originalChat = openaiModule.OpenAICompatibleProvider.prototype.chat;
  openaiModule.OpenAICompatibleProvider.prototype.chat = async () => {
    throw new Error("network error");
  };

  const { chatWithFallback } = require("../server/services/providers/index");
  const result = await chatWithFallback({
    message: "我听力很差",
    profile: { level: "B1", goal: "提升听力" },
    references: [{ label: "听力", title: "Listening", heading: "听力训练", path: "threads/part-1/3-listening.md", summary: "精听方法" }],
    todayTask: { status: "no_plan" },
    contentAvailable: true
  });

  assert.equal(result.provider, "local");
  assert.equal(result.fallbackUsed, true);
  assert.ok(result.reply);
  assert.doesNotMatch(JSON.stringify(result), /test-key-should-fail/);

  openaiModule.OpenAICompatibleProvider.prototype.chat = originalChat;
  process.env.COACH_MODE = originalMode;
  delete process.env.OPENAI_COMPATIBLE_API_KEY;
});

test("chat result does not expose API key", async () => {
  process.env.COACH_MODE = "local";
  delete require.cache[require.resolve("../server/lib/config")];
  delete require.cache[require.resolve("../server/services/providers/index")];
  delete require.cache[require.resolve("../server/services/chat")];
  process.env.OPENAI_COMPATIBLE_API_KEY = "sk-secret-key-1234567890";

  const { handleChat } = require("../server/services/chat");
  const result = await handleChat("如何练听力", { level: "B1" });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /sk-secret-key/);
  assert.ok(result.reply);
  assert.ok(Array.isArray(result.references));
  assert.equal(result.provider, "local");
});
