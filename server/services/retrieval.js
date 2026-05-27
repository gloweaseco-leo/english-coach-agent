const { createId } = require("../lib/ids");
const { stripMarkdown, summarize } = require("../lib/markdown");
const { buildIndex, contentRootExists } = require("./content");
const { RAG_TOP_K } = require("../lib/config");

const MIN_CHUNK_CHARS = 120;
const MAX_CHUNK_CHARS = 800;
const MAX_PARAGRAPH_CHARS = 500;

const TRACK_HINTS = {
  listening: ["listening", "listen", "听力", "听", "audio", "podcast", "3-listening"],
  speaking: ["speaking", "speak", "口语", "说", "发音", "5-speaking"],
  vocabulary: ["vocabulary", "word", "词汇", "单词", "2-vocabulary"],
  reading: ["reading", "read", "阅读", "读", "4-reading"],
  writing: ["writing", "write", "写作", "写", "6-writing"],
  ai: ["ai", "chatgpt", "prompt", "7-ai"],
  understanding: ["understanding", "认知", "1-understanding"]
};

let cachedChunks = null;

function tokenize(input) {
  const lower = String(input || "").toLowerCase();
  const words = lower.match(/[a-z0-9]+|[\u4e00-\u9fff]{1,4}/g) || [];
  return Array.from(new Set(words.filter(w => w.length > 1)));
}

function splitLongText(text) {
  if (text.length <= MAX_CHUNK_CHARS) return [text];
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const parts = [];
  let buf = "";
  for (const para of paragraphs) {
    const piece = para.length > MAX_PARAGRAPH_CHARS
      ? para.match(new RegExp(`.{1,${MAX_PARAGRAPH_CHARS}}(\\s|$)`, "g")) || [para]
      : [para];
    for (const p of piece) {
      if ((buf + " " + p).trim().length > MAX_CHUNK_CHARS && buf) {
        parts.push(buf.trim());
        buf = p;
      } else {
        buf = buf ? `${buf}\n\n${p}` : p;
      }
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.length ? parts : [text.slice(0, MAX_CHUNK_CHARS)];
}

function chunkMarkdown(markdown, meta = {}) {
  const { path = "", title = "", label = "" } = meta;
  const lines = String(markdown || "").split(/\r?\n/);
  const chunks = [];
  let currentHeading = title || label || path;
  let sectionLines = [];

  function flushSection() {
    const raw = sectionLines.join("\n").trim();
    sectionLines = [];
    if (!raw) return;
    const text = stripMarkdown(raw);
    if (text.length < MIN_CHUNK_CHARS / 2) return;
    for (const part of splitLongText(text)) {
      if (part.length < MIN_CHUNK_CHARS / 2) continue;
      chunks.push({
        id: createId("chunk"),
        path,
        title,
        label,
        heading: currentHeading,
        text: part,
        summary: summarize(part, 160)
      });
    }
  }

  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushSection();
      currentHeading = heading[2].replace(/[`*_]/g, "").trim();
      continue;
    }
    sectionLines.push(line);
  }
  flushSection();

  if (!chunks.length) {
    const text = stripMarkdown(markdown);
    if (text.length >= MIN_CHUNK_CHARS / 2) {
      for (const part of splitLongText(text)) {
        chunks.push({
          id: createId("chunk"),
          path,
          title,
          label,
          heading: title || label,
          text: part,
          summary: summarize(part, 160)
        });
      }
    }
  }

  return chunks;
}

function buildChunks(force = false) {
  if (cachedChunks && !force) return cachedChunks;
  if (!contentRootExists()) {
    cachedChunks = [];
    return cachedChunks;
  }
  const docs = buildIndex();
  cachedChunks = docs.flatMap(doc => chunkMarkdown(doc.markdown, {
    path: doc.path,
    title: doc.title,
    label: doc.label
  }));
  return cachedChunks;
}

function clearChunkCache() {
  cachedChunks = null;
}

function scoreChunk(chunk, terms, context = {}) {
  const { weakAreas = [], todayTrack = "" } = context;
  const headingHay = `${chunk.label} ${chunk.title} ${chunk.heading}`.toLowerCase();
  const bodyHay = chunk.text.toLowerCase();
  const pathHay = chunk.path.toLowerCase();
  let score = 0;

  for (const term of terms) {
    const inHeading = headingHay.includes(term);
    const inBody = bodyHay.includes(term);
    const inPath = pathHay.includes(term);
    if (inHeading) score += term.length > 2 ? 8 : 5;
    if (inBody) score += term.length > 2 ? 3 : 1;
    if (inPath) score += 4;
  }

  for (const area of weakAreas) {
    const hints = TRACK_HINTS[area] || [area];
    if (hints.some(h => headingHay.includes(h) || pathHay.includes(h) || bodyHay.includes(h))) {
      score += 6;
    }
  }

  if (todayTrack) {
    const hints = TRACK_HINTS[todayTrack] || [todayTrack];
    if (hints.some(h => headingHay.includes(h) || pathHay.includes(h))) {
      score += 5;
    }
  }

  return score;
}

function search(query, options = {}) {
  const topK = options.topK || RAG_TOP_K;
  const terms = tokenize(query);
  const chunks = options.chunks || buildChunks();
  const context = {
    weakAreas: options.weakAreas || [],
    todayTrack: options.todayTrack || ""
  };

  if (!terms.length) {
    return [];
  }

  return chunks
    .map(chunk => ({ ...chunk, score: scoreChunk(chunk, terms, context) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ text, ...rest }) => rest);
}

function toReferences(results) {
  return results.map(item => ({
    id: item.id,
    path: item.path,
    title: item.title,
    label: item.label,
    heading: item.heading,
    summary: item.summary,
    score: item.score
  }));
}

function getRagStats() {
  const chunks = buildChunks();
  return {
    enabled: contentRootExists(),
    topK: RAG_TOP_K,
    chunks: chunks.length
  };
}

module.exports = {
  TRACK_HINTS,
  tokenize,
  chunkMarkdown,
  buildChunks,
  clearChunkCache,
  scoreChunk,
  search,
  toReferences,
  getRagStats
};
