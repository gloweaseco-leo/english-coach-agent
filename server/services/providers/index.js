const { COACH_MODE } = require("../../lib/config");
const { LocalRuleProvider } = require("./localRuleProvider");
const { OpenAICompatibleProvider } = require("./openaiCompatibleProvider");
const { OllamaProvider } = require("./ollamaProvider");

const localFallback = new LocalRuleProvider();

function getConfiguredMode() {
  const mode = (COACH_MODE || "local").toLowerCase();
  if (["local", "openai", "ollama"].includes(mode)) return mode;
  return "local";
}

function getProviderStatus() {
  const mode = getConfiguredMode();
  if (mode === "local") {
    return { coachMode: "local", providerReady: true, providerWarning: null };
  }
  if (mode === "openai") {
    const ready = OpenAICompatibleProvider.isConfigured();
    return {
      coachMode: "openai",
      providerReady: ready,
      providerWarning: ready
        ? null
        : "OPENAI_COMPATIBLE_API_KEY 未配置，将回退本地规则模式"
    };
  }
  if (mode === "ollama") {
    return {
      coachMode: "ollama",
      providerReady: true,
      providerWarning: null
    };
  }
  return { coachMode: "local", providerReady: true, providerWarning: null };
}

function createProvider(mode = getConfiguredMode()) {
  if (mode === "openai") return new OpenAICompatibleProvider();
  if (mode === "ollama") return new OllamaProvider();
  return new LocalRuleProvider();
}

function sanitizeResult(result) {
  const json = JSON.stringify(result);
  if (json.includes("OPENAI_COMPATIBLE_API_KEY") || json.match(/sk-[a-zA-Z0-9]{10,}/)) {
    throw new Error("Sensitive data detected in response");
  }
  return result;
}

async function chatWithFallback(ctx) {
  const status = getProviderStatus();
  const mode = status.coachMode;
  let providerUsed = "local";
  let fallbackUsed = false;
  let providerWarning = status.providerWarning;

  if (mode === "local" || !status.providerReady) {
    const result = await localFallback.chat(ctx);
    return sanitizeResult({
      ...result,
      provider: "local",
      fallbackUsed: mode !== "local",
      providerWarning
    });
  }

  const provider = createProvider(mode);
  try {
    const result = await provider.chat(ctx);
    providerUsed = provider.name;
    return sanitizeResult({
      ...result,
      provider: providerUsed,
      fallbackUsed: false,
      providerWarning: null
    });
  } catch (error) {
    console.error(`Provider ${mode} failed:`, error.message);
    const result = await localFallback.chat(ctx);
    fallbackUsed = true;
    providerWarning = `LLM 请求失败（${error.message}），已回退本地规则模式`;
    return sanitizeResult({
      ...result,
      provider: "local",
      fallbackUsed: true,
      providerWarning
    });
  }
}

module.exports = {
  getConfiguredMode,
  getProviderStatus,
  createProvider,
  chatWithFallback,
  LocalRuleProvider,
  OpenAICompatibleProvider,
  OllamaProvider
};
