const fs = require("fs");
const path = require("path");
const { CONTENT_ROOT } = require("../lib/config");
const { CHAPTER_LABELS, stripMarkdown, extractTitle, summarize } = require("../lib/markdown");

const CORE_PATHS = [
  "README.md",
  "threads/part-1/1-understanding.md",
  "threads/part-1/2-vocabulary.md",
  "threads/part-1/3-listening.md",
  "threads/part-1/4-reading.md",
  "threads/part-1/5-speaking.md",
  "threads/part-1/6-writing.md",
  "threads/part-1/7-ai.md",
  "threads/part-2/x-misc.md",
  "threads/word-list/Common.md"
];

let cachedIndex = null;

function contentRootExists() {
  return fs.existsSync(CONTENT_ROOT);
}

function walkMarkdown(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "assets" || entry.name === "en") continue;
      files.push(...walkMarkdown(full, base));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  }
  return files;
}

function buildIndex() {
  if (!contentRootExists()) return [];
  if (cachedIndex) return cachedIndex;

  const allPaths = Array.from(new Set([...CORE_PATHS, ...walkMarkdown(CONTENT_ROOT)]))
    .filter(rel => fs.existsSync(path.join(CONTENT_ROOT, rel)));

  cachedIndex = allPaths.map(rel => {
    const markdown = fs.readFileSync(path.join(CONTENT_ROOT, rel), "utf8");
    const text = stripMarkdown(markdown);
    return {
      path: rel,
      label: CHAPTER_LABELS[rel] || extractTitle(markdown, rel),
      title: extractTitle(markdown, rel),
      summary: summarize(markdown),
      text,
      markdown,
      wordCount: text.split(/\s+/).filter(Boolean).length
    };
  });
  return cachedIndex;
}

function clearIndexCache() {
  cachedIndex = null;
  try {
    require("./retrieval").clearChunkCache();
  } catch {
    // retrieval optional during tests
  }
}

function tokenize(input) {
  const lower = String(input || "").toLowerCase();
  const words = lower.match(/[a-z0-9]+|[\u4e00-\u9fff]{1,4}/g) || [];
  return Array.from(new Set(words.filter(w => w.length > 1)));
}

function searchContent(query, limit = 4) {
  const terms = tokenize(query);
  const docs = buildIndex();
  const scored = docs.map(doc => {
    const haystack = `${doc.label} ${doc.title} ${doc.text}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (haystack.includes(term)) score += term.length > 2 ? 3 : 1;
      if (`${doc.label} ${doc.title}`.toLowerCase().includes(term)) score += 5;
    }
    return { doc, score };
  });
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.doc);
}

function getChapter(rel) {
  return buildIndex().find(item => item.path === rel) || null;
}

function listChapters() {
  return buildIndex().map(({ markdown, text, ...chapter }) => chapter);
}

module.exports = {
  CORE_PATHS,
  contentRootExists,
  buildIndex,
  clearIndexCache,
  searchContent,
  getChapter,
  listChapters
};
