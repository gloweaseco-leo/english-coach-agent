const CHAPTER_LABELS = {
  "README.md": "总览",
  "threads/part-1/1-understanding.md": "认知",
  "threads/part-1/2-vocabulary.md": "词汇",
  "threads/part-1/3-listening.md": "听力",
  "threads/part-1/4-reading.md": "阅读",
  "threads/part-1/5-speaking.md": "口语",
  "threads/part-1/6-writing.md": "写作",
  "threads/part-1/7-ai.md": "AI 学习",
  "threads/part-2/x-misc.md": "杂谈",
  "threads/word-list/Common.md": "通用词表"
};

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(markdown, fallback) {
  const heading = markdown.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].replace(/[`*_]/g, "").trim();
  return CHAPTER_LABELS[fallback] || fallback.split("/").pop().replace(".md", "");
}

function summarize(text, length = 220) {
  const clean = stripMarkdown(text);
  if (clean.length <= length) return clean;
  return clean.slice(0, length).replace(/\s+\S*$/, "") + "...";
}

module.exports = {
  CHAPTER_LABELS,
  stripMarkdown,
  extractTitle,
  summarize
};
