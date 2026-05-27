const { OLLAMA_BASE_URL, OLLAMA_MODEL, LLM_TIMEOUT_MS } = require("../../lib/config");
const { buildLlmPrompt } = require("./localRuleProvider");

class OllamaProvider {
  get name() {
    return "ollama";
  }

  async chat(ctx) {
    const base = OLLAMA_BASE_URL.replace(/\/$/, "");
    const prompt = buildLlmPrompt(ctx);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    try {
      const response = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            { role: "system", content: "You are English Coach Agent. Follow the user prompt strictly." },
            { role: "user", content: prompt }
          ],
          stream: false
        }),
        signal: controller.signal
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Ollama HTTP ${response.status}`);
      }

      const reply = data.message?.content?.trim();
      if (!reply) throw new Error("Empty Ollama response");

      return { reply, usage: null };
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { OllamaProvider };
