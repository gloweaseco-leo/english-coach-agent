const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chunkMarkdown, search, scoreChunk, tokenize } = require("../server/services/retrieval");

const MOCK_LISTENING = `# Listening Guide

## 听力训练方法

Listening is the foundation of language input. You should practice with short audio clips first.

盲听后再对照文本，标出连读和弱读。每天 15 分钟精听比泛听更有效。

## 常见误区

Many learners only watch subtitles. This hurts listening progress.
`;

const MOCK_SPEAKING = `# Speaking

## 口语输出

Speaking practice requires recording yourself and reviewing hesitation points.
`;

test("chunkMarkdown creates chunks from headings", () => {
  const chunks = chunkMarkdown(MOCK_LISTENING, {
    path: "threads/part-1/3-listening.md",
    title: "Listening",
    label: "听力"
  });
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every(c => c.id && c.path && c.text && c.heading));
});

test("search listening hits listening-related chunk", () => {
  const chunks = [
    ...chunkMarkdown(MOCK_LISTENING, { path: "threads/part-1/3-listening.md", title: "Listening", label: "听力" }),
    ...chunkMarkdown(MOCK_SPEAKING, { path: "threads/part-1/5-speaking.md", title: "Speaking", label: "口语" })
  ];
  const results = search("listening 听力", { chunks, topK: 3 });
  assert.ok(results.length > 0);
  assert.match(results[0].path, /listening/);
});

test("heading match scores higher than plain body match", () => {
  const terms = tokenize("听力");
  const headingHit = {
    id: "a",
    path: "threads/part-1/3-listening.md",
    title: "Listening",
    label: "General",
    heading: "听力训练方法",
    text: "Practice with short audio clips every day."
  };
  const bodyHit = {
    id: "b",
    path: "threads/part-2/x-misc.md",
    title: "Misc",
    label: "General",
    heading: "Other topic",
    text: "这是一段关于听力和精听的说明。"
  };
  assert.ok(scoreChunk(headingHit, terms, {}) > scoreChunk(bodyHit, terms, {}));
});

test("topK limits search results", () => {
  const chunks = chunkMarkdown(MOCK_LISTENING, {
    path: "threads/part-1/3-listening.md",
    title: "Listening",
    label: "听力"
  });
  const results = search("listening", { chunks, topK: 1 });
  assert.equal(results.length, 1);
});
