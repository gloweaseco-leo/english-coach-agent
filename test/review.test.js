const { test } = require("node:test");
const assert = require("node:assert/strict");
const { reviewPractice } = require("../server/services/review");

test("reviewPractice returns prompt for empty text", () => {
  const result = reviewPractice({ text: "" });
  assert.equal(result.score, null);
  assert.match(result.feedback, /先贴一段/);
  assert.equal(result.issues.length, 0);
});

test("reviewPractice suggests examples for short text", () => {
  const result = reviewPractice({ text: "I think English is good. I want to improve." });
  assert.ok(result.score !== null);
  assert.ok(result.issues.some(i => i.type === "length" || i.type === "clarity"));
  assert.ok(result.revisionChecklist.length > 0);
});

test("reviewPractice scores higher with examples and connectors", () => {
  const basic = reviewPractice({
    text: "I think English is good. I want to improve my skills every day."
  });
  const rich = reviewPractice({
    text: "First, I want to improve my English because it helps my career. For example, when I join meetings, I can express ideas clearly. However, I still need more practice. Finally, I will write summaries every week."
  });
  assert.ok(rich.score > basic.score);
  assert.ok(rich.issues.length <= basic.issues.length);
});

test("reviewPractice keeps legacy feedback field", () => {
  const result = reviewPractice({
    type: "作文",
    focus: "清晰度",
    text: "First, reading helps because it builds vocabulary. For example, when I read news, I learn new phrases. However, I need more practice."
  });
  assert.ok(typeof result.feedback === "string");
  assert.ok(result.summary);
  assert.ok(result.nextAction);
});
