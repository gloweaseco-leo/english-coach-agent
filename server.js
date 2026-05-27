const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 4173);
const CONTENT_ROOT = process.env.ENGLISH_TIPS_ROOT
  ? path.resolve(process.env.ENGLISH_TIPS_ROOT)
  : path.resolve(__dirname, "..", "English-level-up-tips", "docs");
const PUBLIC_ROOT = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

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

let cachedIndex = null;

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body, null, 2));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function safeJoin(root, requestedPath) {
  const decoded = decodeURIComponent(requestedPath || "");
  const resolved = path.resolve(root, decoded);
  if (!resolved.startsWith(root)) {
    throw new Error("Invalid path");
  }
  return resolved;
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

function buildIndex() {
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

function chooseFocus(message) {
  const text = String(message || "");
  const rules = [
    ["听力", /听|listening|podcast|音频|电影|美剧/i],
    ["口语", /说|口语|speaking|发音|对话|表达/i],
    ["词汇", /词|单词|vocabulary|背|记忆/i],
    ["阅读", /读|阅读|reading|文章|原版/i],
    ["写作", /写|作文|writing|邮件|润色/i],
    ["AI 学习", /ai|chatgpt|gemini|claude|prompt|提示词/i]
  ];
  const hit = rules.find(([, pattern]) => pattern.test(text));
  return hit ? hit[0] : "认知";
}

function answerQuestion(message, profile = {}) {
  const focus = chooseFocus(message);
  const refs = searchContent(`${message} ${focus}`, 4);
  const level = profile.level || "未设置";
  const goal = profile.goal || "提升综合英语能力";

  const taskMap = {
    "听力": ["选 3-5 分钟材料，先盲听记录关键词", "对照文本复听，标出连读、弱读和没听出的词", "跟读 2 遍，最后用中文复述主旨"],
    "口语": ["围绕一个生活话题写 6 句英文", "读出来并录音，检查停顿和卡壳点", "把卡壳句改短，再复述 2 遍"],
    "词汇": ["从今天阅读材料中摘 12 个词", "每个词只记一个常用搭配和一个例句", "晚上用这些词写 5 句自己的句子"],
    "阅读": ["读一篇短文，先抓标题和段落主题", "圈出生词但不要立刻查，先猜含义", "读完写 3 句英文摘要"],
    "写作": ["写 120-180 词短文", "删掉空泛句，补充例子和动作", "检查时态、冠词、连接词"],
    "AI 学习": ["让 AI 生成一组可跟读对话", "让 AI 扮演考官追问 5 轮", "把回答中的错误整理成错题卡"],
    "认知": ["先明确一个 7 天目标", "每天只做一个可完成训练动作", "记录投入时间和最卡的点"]
  };

  return {
    reply: [
      `按你当前目标“${goal}”和水平“${level}”，我建议先抓“${focus}”。`,
      "今天不要铺太开，做一个闭环：输入 -> 复述/输出 -> 纠错 -> 复盘。",
      "具体任务：",
      ...taskMap[focus].map((item, index) => `${index + 1}. ${item}`),
      "完成后把你的输出贴回来，我可以继续按这个框架给你反馈。"
    ].join("\n"),
    focus,
    references: refs.map(ref => ({
      path: ref.path,
      title: ref.title,
      label: ref.label,
      summary: ref.summary
    }))
  };
}

function createPlan({ level = "B1", goal = "综合提升", days = 14, minutes = 45 } = {}) {
  const totalDays = Math.max(3, Math.min(90, Number(days) || 14));
  const dailyMinutes = Math.max(15, Math.min(180, Number(minutes) || 45));
  const tracks = [
    { name: "认知校准", chapter: "threads/part-1/1-understanding.md", task: "复盘学习目标，拆成一个可执行动作。" },
    { name: "词汇输入", chapter: "threads/part-1/2-vocabulary.md", task: "从真实材料提取词汇，记录搭配和例句。" },
    { name: "听力训练", chapter: "threads/part-1/3-listening.md", task: "短材料盲听、精听、跟读三轮。" },
    { name: "阅读训练", chapter: "threads/part-1/4-reading.md", task: "读一篇短文，写三句摘要。" },
    { name: "口语输出", chapter: "threads/part-1/5-speaking.md", task: "围绕一个话题录音 60 秒。" },
    { name: "写作输出", chapter: "threads/part-1/6-writing.md", task: "写 120-180 词并自查。" },
    { name: "AI 加速", chapter: "threads/part-1/7-ai.md", task: "用 AI 做追问、纠错和材料生成。" }
  ];
  const daysPlan = Array.from({ length: totalDays }, (_, index) => {
    const track = tracks[index % tracks.length];
    const output = index % 3 === 2 ? "提交一段英文输出给教练反馈。" : "记录 3 条新发现和 1 个卡点。";
    return {
      day: index + 1,
      title: `${track.name}: ${track.task}`,
      minutes: dailyMinutes,
      chapter: track.chapter,
      output
    };
  });
  return {
    overview: `${totalDays} 天计划，目标：${goal}，当前水平：${level}。每天约 ${dailyMinutes} 分钟，按“输入-输出-反馈”循环推进。`,
    days: daysPlan
  };
}

function reviewPractice({ type = "综合", text = "", focus = "" } = {}) {
  const raw = String(text || "").trim();
  if (!raw) {
    return {
      score: null,
      feedback: "先贴一段你的英文作文、口语稿或学习复盘，我会按清晰度、准确度和可改进动作反馈。"
    };
  }

  const words = raw.split(/\s+/).filter(Boolean);
  const hasExamples = /\b(for example|such as|because|when|if|so that)\b/i.test(raw);
  const hasConnectors = /\b(however|therefore|also|first|second|finally|although|but)\b/i.test(raw);
  const longSentences = raw.split(/[.!?。！？]/).filter(s => s.trim().split(/\s+/).length > 28).length;
  const score = Math.max(55, Math.min(92,
    62 + Math.min(words.length, 120) / 5 + (hasExamples ? 8 : 0) + (hasConnectors ? 6 : 0) - longSentences * 5
  ));

  const suggestions = [];
  if (words.length < 50) suggestions.push("输出偏短，下一版补一个具体例子，让观点更可判断。");
  if (!hasExamples) suggestions.push("加入 because / for example / when 这类结构，把观点落到场景。");
  if (!hasConnectors) suggestions.push("补充 first / however / finally 等连接词，让逻辑更清楚。");
  if (longSentences > 0) suggestions.push("有句子过长，拆成两句会更自然。");
  if (suggestions.length === 0) suggestions.push("结构已经比较完整，下一步重点检查搭配和语气自然度。");

  return {
    score: Math.round(score),
    feedback: [
      `类型：${type}。重点：${focus || "表达清晰度"}.`,
      `估计完成度：${Math.round(score)}/100。`,
      "建议：",
      ...suggestions.map((item, index) => `${index + 1}. ${item}`),
      "下一步：按建议改一版，再把新版贴回来。"
    ].join("\n")
  };
}

async function handleApi(req, res, pathname, url) {
  if (pathname === "/api/health") {
    return send(res, 200, {
      ok: true,
      contentRoot: CONTENT_ROOT,
      chapters: buildIndex().length
    });
  }
  if (pathname === "/api/chapters") {
    return send(res, 200, {
      chapters: buildIndex().map(({ markdown, text, ...chapter }) => chapter)
    });
  }
  if (pathname === "/api/chapter") {
    const rel = url.searchParams.get("path") || "README.md";
    const chapter = buildIndex().find(item => item.path === rel);
    if (!chapter) return send(res, 404, { error: "Chapter not found" });
    return send(res, 200, {
      path: chapter.path,
      title: chapter.title,
      label: chapter.label,
      markdown: chapter.markdown
    });
  }
  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }
  const body = await readJson(req);
  if (pathname === "/api/chat") return send(res, 200, answerQuestion(body.message, body.profile));
  if (pathname === "/api/plan") return send(res, 200, createPlan(body));
  if (pathname === "/api/review") return send(res, 200, reviewPractice(body));
  return send(res, 404, { error: "Not found" });
}

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  let filePath;
  try {
    filePath = safeJoin(PUBLIC_ROOT, requested);
  } catch {
    return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(req, res, url.pathname, url);
    }
    return serveStatic(req, res, url.pathname);
  } catch (error) {
    return send(res, 500, { error: error.message || String(error) });
  }
});

server.listen(PORT, () => {
  console.log(`English Coach Agent running at http://127.0.0.1:${PORT}`);
  console.log(`Content root: ${CONTENT_ROOT}`);
});
