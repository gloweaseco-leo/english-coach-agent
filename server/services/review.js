const VAGUE_WORDS = /\b(very|good|thing|important|nice|bad|stuff|many|lot)\b/gi;
const EXAMPLE_PATTERNS = /\b(for example|such as|because|when|if|so that|like when)\b/i;
const CONNECTOR_PATTERNS = /\b(however|therefore|also|first|second|finally|although|but|moreover|in addition)\b/i;
const CHINESE_PUNCT = /[。！？；：""''【】]/;

function reviewPractice({ type = "综合", text = "", focus = "" } = {}) {
  const raw = String(text || "").trim();
  if (!raw) {
    return {
      score: null,
      feedback: "先贴一段你的英文作文、口语稿或学习复盘，我会按清晰度、准确度和可改进动作反馈。",
      summary: "",
      issues: [],
      revisionChecklist: [],
      nextAction: "粘贴你的英文输出后再获取反馈。"
    };
  }

  const words = raw.split(/\s+/).filter(Boolean);
  const hasExamples = EXAMPLE_PATTERNS.test(raw);
  const hasConnectors = CONNECTOR_PATTERNS.test(raw);
  const longSentences = raw.split(/[.!?。！？]/).filter(s => s.trim().split(/\s+/).length > 28).length;
  const chinesePunct = CHINESE_PUNCT.test(raw);
  const vagueMatches = raw.match(VAGUE_WORDS) || [];
  const vagueCount = vagueMatches.length;

  let score = 62 + Math.min(words.length, 120) / 5;
  if (hasExamples) score += 8;
  if (hasConnectors) score += 6;
  score -= longSentences * 5;
  score -= vagueCount * 2;
  if (chinesePunct) score -= 4;
  if (words.length < 50) score -= 5;
  score = Math.max(55, Math.min(92, score));

  const issues = [];
  const revisionChecklist = [];

  if (words.length < 50) {
    issues.push({
      type: "length",
      title: "输出偏短",
      evidence: `当前约 ${words.length} 词，观点展开空间有限`,
      suggestion: "补一个具体例子，让观点更可判断"
    });
    revisionChecklist.push("补充 1 个 for example 或 because 展开句");
  }

  if (!hasExamples) {
    issues.push({
      type: "clarity",
      title: "观点有，但例子不足",
      evidence: "文本中缺少 because / for example / when 等展开结构",
      suggestion: "补一个具体场景，让观点更容易判断"
    });
    revisionChecklist.push("补充 1 个 because 句子");
  }

  if (!hasConnectors) {
    issues.push({
      type: "structure",
      title: "逻辑连接偏弱",
      evidence: "未发现 first / however / finally 等连接词",
      suggestion: "补充连接词，让段落层次更清楚"
    });
    revisionChecklist.push("加入 first / however / finally 其中至少 2 个连接词");
  }

  if (longSentences > 0) {
    issues.push({
      type: "syntax",
      title: "存在过长句子",
      evidence: `检测到 ${longSentences} 句超过 28 词`,
      suggestion: "把长句拆成两句，读起来更自然"
    });
    revisionChecklist.push("把超过 28 个词的长句拆成两句");
  }

  if (chinesePunct) {
    issues.push({
      type: "format",
      title: "中英文标点混用",
      evidence: "文本中包含中文标点（。！？等）",
      suggestion: "英文输出统一使用英文标点"
    });
    revisionChecklist.push("将中文标点替换为英文 . ! ? 等");
  }

  if (vagueCount > 0) {
    issues.push({
      type: "wording",
      title: "泛词使用偏多",
      evidence: `检测到 very/good/thing/important 等泛词 ${vagueCount} 次`,
      suggestion: "换成更具体的动词或名词"
    });
    revisionChecklist.push("把 very/good/thing 各替换 1 处为更具体表达");
  }

  if (issues.length === 0) {
    issues.push({
      type: "polish",
      title: "结构较完整",
      evidence: "长度、例子、连接词基本到位",
      suggestion: "下一步重点检查搭配和语气自然度"
    });
    revisionChecklist.push("大声朗读全文，标记 2 处不自然的搭配");
  }

  const rounded = Math.round(score);
  const summary = issues.length <= 1 && issues[0]?.type === "polish"
    ? "整体表达清楚，结构较完整，可继续打磨自然度。"
    : "整体表达有基础，但例子、连接或句式还有明显提升空间。";

  const suggestions = issues.map(i => i.suggestion);
  const feedback = [
    `类型：${type}。重点：${focus || "表达清晰度"}.`,
    `估计完成度：${rounded}/100。`,
    summary,
    "建议：",
    ...suggestions.map((item, index) => `${index + 1}. ${item}`),
    "修订清单：",
    ...revisionChecklist.map((item, index) => `${index + 1}. ${item}`),
    "下一步：按清单改一版，再提交新版。"
  ].join("\n");

  return {
    score: rounded,
    feedback,
    summary,
    issues,
    revisionChecklist,
    nextAction: "按清单改一版，再提交新版。"
  };
}

module.exports = { reviewPractice };
