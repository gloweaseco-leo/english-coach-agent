const { test } = require("node:test");
const assert = require("node:assert/strict");

test("handleChat returns reply references and provider", async () => {
  delete require.cache[require.resolve("../server/services/chat")];
  const { handleChat } = require("../server/services/chat");
  const result = await handleChat("如何提升听力", {
    level: "B1",
    goal: "提升听力",
    weakAreas: ["listening"]
  });
  assert.ok(result.reply);
  assert.ok(Array.isArray(result.references));
  assert.ok(result.provider);
  assert.equal(result.mode, "rag");
  assert.equal(typeof result.fallbackUsed, "boolean");
});

test("handleChat works when content root missing", async () => {
  delete require.cache[require.resolve("../server/services/chat")];
  const { handleChat } = require("../server/services/chat");
  const result = await handleChat("hello", { level: "A1-A2" });
  assert.ok(result.reply);
  assert.equal(result.references.length, 0);
  assert.ok(result.contentWarning);
});

test("search API handler returns results shape", () => {
  const { search } = require("../server/services/retrieval");
  const { chunkMarkdown } = require("../server/services/retrieval");
  const chunks = chunkMarkdown(`# Listening\n\n## 听力\n\nPractice listening every day with short clips.`, {
    path: "threads/part-1/3-listening.md",
    title: "Listening",
    label: "听力"
  });
  const results = search("listening", { chunks, topK: 5 });
  assert.ok(Array.isArray(results));
  if (results.length) {
    assert.ok(results[0].path);
    assert.ok(typeof results[0].score === "number");
  }
});
