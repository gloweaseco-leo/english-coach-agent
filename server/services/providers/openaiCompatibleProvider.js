const {
  OPENAI_COMPATIBLE_BASE_URL,
  OPENAI_COMPATIBLE_API_KEY,
  OPENAI_COMPATIBLE_MODEL,
  LLM_TIMEOUT_MS
} = require("../../lib/config");
const { buildLlmPrompt } = require("./localRuleProvider");

class OpenAICompatibleProvider {
  get name() {
    return "openai";
  }

  static isConfigured() {
    return Boolean(OPENAI_COMPATIBLE_API_KEY);
  }

  async chat(ctx) {
    if (!OpenAICompatibleProvider.isConfigured()) {
      throw new Error("OpenAI-compatible API key not configured");
    }

    const base = OPENAI_COMPATIBLE_BASE_URL.replace(/\/$/, "");
    const prompt = buildLlmPrompt(ctx);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    try {
      const response = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_COMPATIBLE_API_KEY}`
        },
        body: JSON.stringify({
          model: OPENAI_COMPATIBLE_MODEL,
          messages: [
            { role: "system", content: "You are English Coach Agent. Follow the user prompt strictly." },
            { role: "user", content: prompt }
          ],
          temperature: 0.4
        }),
        signal: controller.signal
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = data.error?.message || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error("Empty LLM response");

      return {
        reply,
        usage: data.usage || null
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { OpenAICompatibleProvider };
