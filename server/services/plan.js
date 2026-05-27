const { createId } = require("../lib/ids");

const ALL_TRACKS = ["listening", "speaking", "vocabulary", "reading", "writing", "ai"];

const TRACK_META = {
  listening: { chapter: "threads/part-1/3-listening.md", label: "听力" },
  speaking: { chapter: "threads/part-1/5-speaking.md", label: "口语" },
  vocabulary: { chapter: "threads/part-1/2-vocabulary.md", label: "词汇" },
  reading: { chapter: "threads/part-1/4-reading.md", label: "阅读" },
  writing: { chapter: "threads/part-1/6-writing.md", label: "写作" },
  ai: { chapter: "threads/part-1/7-ai.md", label: "AI 辅助学习" },
  understanding: { chapter: "threads/part-1/1-understanding.md", label: "认知复盘" }
};

const LEVEL_TASKS = {
  "A1-A2": {
    listening: {
      title: "短句听力 + 中文复述",
      instructions: ["选择 1-2 分钟慢速音频", "第一遍不看文本，写下 5 个听到的词", "对照文本复听，标出没听出的词", "用中文复述大意"],
      outputRequirement: "提交 5 个关键词 + 2 句中文复述"
    },
    speaking: {
      title: "基础句型跟读",
      instructions: ["选 6 个日常句型", "逐句跟读 3 遍", "替换 2 个词再说一遍", "录音 30 秒自我检查"],
      outputRequirement: "提交 4 句跟读句 + 1 个卡壳点"
    },
    vocabulary: {
      title: "高频词搭配记忆",
      instructions: ["从材料中摘 8 个基础词", "每个词记 1 个搭配", "写 4 句简单英文句", "晚上快速复习一遍"],
      outputRequirement: "提交 8 词 + 4 句例句"
    },
    reading: {
      title: "短文通读 + 中文摘要",
      instructions: ["读一篇 150 词左右短文", "圈出生词先猜义", "查 3 个最关键的词", "写 2 句中文摘要"],
      outputRequirement: "提交 3 个生词释义 + 中文摘要"
    },
    writing: {
      title: "短句写作练习",
      instructions: ["围绕一个话题写 6-8 句", "每句尽量短", "检查主谓一致", "读出声找不自然处"],
      outputRequirement: "提交 6-8 句英文 + 自查 2 点"
    },
    ai: {
      title: "AI 辅助基础对话",
      instructions: ["让 AI 生成 5 组问答", "跟读每组回答", "替换关键词再练", "记录 2 个新表达"],
      outputRequirement: "提交 2 个新表达 + 1 段跟读感受"
    }
  },
  B1: {
    listening: {
      title: "短材料盲听 + 关键词记录",
      instructions: ["选择 3-5 分钟英文音频", "第一遍不看文本，写下关键词", "第二遍对照文本，标出没听出的词", "用中文复述主旨"],
      outputRequirement: "提交 5 个关键词 + 3 句复述"
    },
    speaking: {
      title: "话题短表达",
      instructions: ["围绕一个生活话题写 6 句英文", "读出来并录音", "检查停顿和卡壳点", "把卡壳句改短再复述"],
      outputRequirement: "提交 6 句英文 + 60 秒录音要点"
    },
    vocabulary: {
      title: "语境词汇提取",
      instructions: ["从阅读/听力材料摘 12 个词", "每个词记一个常用搭配", "写 5 句自己的句子", "标记 3 个易混词"],
      outputRequirement: "提交 12 词表 + 5 句输出"
    },
    reading: {
      title: "短文阅读 + 英文摘要",
      instructions: ["读一篇短文，抓段落主题", "圈出生词但不立刻查", "猜义后再查关键词", "写 3 句英文摘要"],
      outputRequirement: "提交 3 句英文摘要 + 5 个生词"
    },
    writing: {
      title: "120 词短文写作",
      instructions: ["写 120-180 词短文", "删掉空泛句，补充例子", "检查时态、冠词、连接词", "大声朗读自查"],
      outputRequirement: "提交 120-180 词短文"
    },
    ai: {
      title: "AI 追问与纠错",
      instructions: ["让 AI 生成可跟读对话", "扮演考官追问 5 轮", "整理错误到错题卡", "挑 3 个表达改写"],
      outputRequirement: "提交错题卡 3 条 + 改写句"
    }
  },
  B2: {
    listening: {
      title: "精听 + 观点抓取",
      instructions: ["选 5-8 分钟材料盲听", "记录主旨和 2 个支撑点", "对照文本补漏", "用英文概括 3 句"],
      outputRequirement: "提交 3 句英文概括 + 漏听词表"
    },
    speaking: {
      title: "观点表达训练",
      instructions: ["选一个社会/工作话题", "准备观点 + 理由 + 例子", "录音 90 秒", "回听修正逻辑跳跃"],
      outputRequirement: "提交 90 秒表达提纲 + 改进点"
    },
    vocabulary: {
      title: "搭配与语块积累",
      instructions: ["从材料提取 15 个语块", "按主题分组", "每个语块造 1 句", "复习时只看搭配猜句意"],
      outputRequirement: "提交 15 语块 + 5 原创句"
    },
    reading: {
      title: "观点阅读 + 摘要",
      instructions: ["读一篇 400 词文章", "标注作者观点", "写 4 句英文摘要", "列出 1 个同意/不同意点"],
      outputRequirement: "提交摘要 4 句 + 评论 2 句"
    },
    writing: {
      title: "论证型短文",
      instructions: ["写 180-220 词论证文", "确保有观点、例子、连接词", "检查段落结构", "改一版更自然的表达"],
      outputRequirement: "提交 180-220 词作文"
    },
    ai: {
      title: "AI 模拟讨论",
      instructions: ["让 AI 扮演讨论伙伴", "围绕话题辩论 8 轮", "记录被问倒的问题", "整理 5 个高分表达"],
      outputRequirement: "提交 5 表达 + 2 个待补强问题"
    }
  },
  "C1+": {
    listening: {
      title: "精听 + 语篇分析",
      instructions: ["选 8-12 分钟讲座/访谈", "盲听记录结构和转折", "对照文本分析连读弱读", "英文总结 5 句含评价"],
      outputRequirement: "提交 5 句英文总结 + 结构笔记"
    },
    speaking: {
      title: "即兴表达与改写",
      instructions: ["随机话题即兴 2 分钟", "回听找冗余和口头禅", "改写为更精炼版本", "再录 1 分钟"],
      outputRequirement: "提交改写前后对比要点"
    },
    vocabulary: {
      title: "高级搭配与语域",
      instructions: ["从原版材料摘 15 个高级表达", "区分正式/非正式语域", "各写 1 句", "替换段落中的低级词"],
      outputRequirement: "提交语域对比表 + 改写段"
    },
    reading: {
      title: "长文摘要与改写",
      instructions: ["读 600+ 词文章", "写 5 句摘要", "改写成不同语气版本", "标注 3 处难句"],
      outputRequirement: "提交双版本摘要"
    },
    writing: {
      title: "长文摘要与表达润色",
      instructions: ["写 250+ 词或改写一篇", "优化衔接与自然度", "替换 5 处弱表达", "检查论证深度"],
      outputRequirement: "提交润色后全文 + 修改清单"
    },
    ai: {
      title: "AI 高强度模拟",
      instructions: ["模拟面试/演讲 Q&A 10 轮", "要求 AI 追问细节", "整理逻辑漏洞", "准备 3 个备用论据"],
      outputRequirement: "提交 Q&A 复盘 + 论据库"
    }
  }
};

const REVIEW_TASK = {
  title: "周复盘：目标、卡点与下周调整",
  instructions: [
    "回顾本周完成的任务，列出 3 个有效动作",
    "记录 2 个持续卡点（具体到技能/场景）",
    "对照指南章节，调整下周优先 weak area",
    "写一段 80-120 词英文或中文复盘"
  ],
  outputRequirement: "提交复盘文本 + 下周 1 个重点调整"
};

function normalizeLevel(level) {
  const value = String(level || "B1");
  if (LEVEL_TASKS[value]) return value;
  return "B1";
}

function buildTrackPool(weakAreas) {
  const weak = (weakAreas || []).filter(t => ALL_TRACKS.includes(t));
  const pool = [];
  for (const track of ALL_TRACKS) {
    pool.push(track);
    if (weak.includes(track)) pool.push(track);
  }
  if (weak.length) {
    for (const track of weak) pool.push(track);
  }
  return pool.length ? pool : ALL_TRACKS;
}

function pickTrack(dayIndex, pool) {
  return pool[(dayIndex - 1) % pool.length];
}

function buildTask({ day, track, level, minutes, kind = "regular" }) {
  const meta = TRACK_META[track] || TRACK_META.listening;
  const templates = LEVEL_TASKS[level] || LEVEL_TASKS.B1;

  if (kind === "review") {
    return {
      id: createId("task"),
      day,
      track: "understanding",
      title: REVIEW_TASK.title,
      chapter: TRACK_META.understanding.chapter,
      minutes,
      instructions: [...REVIEW_TASK.instructions],
      outputRequirement: REVIEW_TASK.outputRequirement,
      status: "not_started",
      completedAt: null,
      reflection: "",
      kind: "review"
    };
  }

  const template = templates[track] || templates.listening;
  const isOutputDay = day % 3 === 0;

  return {
    id: createId("task"),
    day,
    track,
    title: template.title,
    chapter: meta.chapter,
    minutes,
    instructions: [...template.instructions],
    outputRequirement: isOutputDay
      ? `${template.outputRequirement}；并到「练习反馈」提交输出`
      : template.outputRequirement,
    status: "not_started",
    completedAt: null,
    reflection: "",
    kind: isOutputDay ? "output" : "regular"
  };
}

function createPlan({
  level = "B1",
  goal = "综合提升",
  days = 14,
  minutes = 45,
  weakAreas = [],
  scenario = "daily"
} = {}) {
  const totalDays = Math.max(3, Math.min(90, Number(days) || 14));
  const dailyMinutes = Math.max(15, Math.min(180, Number(minutes) || 45));
  const normalizedLevel = normalizeLevel(level);
  const pool = buildTrackPool(weakAreas);

  const tasks = [];
  for (let day = 1; day <= totalDays; day += 1) {
    if (day % 7 === 0) {
      tasks.push(buildTask({ day, track: "understanding", level: normalizedLevel, minutes: dailyMinutes, kind: "review" }));
    } else {
      const track = pickTrack(day, pool);
      tasks.push(buildTask({ day, track, level: normalizedLevel, minutes: dailyMinutes }));
    }
  }

  const profileSnapshot = { level: normalizedLevel, goal, minutes: dailyMinutes, weakAreas, scenario };
  const activePlan = {
    id: createId("plan"),
    createdAt: new Date().toISOString(),
    days: totalDays,
    profileSnapshot,
    tasks
  };

  const daysCompat = tasks.map(task => ({
    day: task.day,
    title: `${TRACK_META[task.track]?.label || task.track}: ${task.title}`,
    minutes: task.minutes,
    chapter: task.chapter,
    output: task.outputRequirement
  }));

  return {
    overview: `${totalDays} 天计划，目标：${goal}，当前水平：${normalizedLevel}。每天约 ${dailyMinutes} 分钟，按“输入-输出-反馈”循环推进。`,
    days: daysCompat,
    activePlan
  };
}

function getTodayTask(state) {
  const plan = state?.activePlan;
  if (!plan || !plan.tasks?.length) {
    return { status: "no_plan", message: "还没有生成学习计划，请先生成 14 天或 30 天计划。" };
  }

  const pending = plan.tasks.find(t => t.status === "not_started" || t.status === "in_progress");
  if (pending) {
    return { status: "active", task: pending };
  }

  const allDone = plan.tasks.every(t => t.status === "completed" || t.status === "reviewed");
  if (allDone) {
    return {
      status: "completed",
      message: "恭喜，当前计划全部完成！可以生成新计划继续训练。",
      stats: state.stats
    };
  }

  return { status: "active", task: plan.tasks.find(t => t.status !== "reviewed" && t.status !== "completed") };
}

function countWeakAreaTasks(tasks, weakAreas) {
  if (!weakAreas?.length) return {};
  const counts = Object.fromEntries(weakAreas.map(w => [w, 0]));
  for (const task of tasks) {
    if (counts[task.track] !== undefined) counts[task.track] += 1;
  }
  return counts;
}

module.exports = {
  ALL_TRACKS,
  TRACK_META,
  createPlan,
  getTodayTask,
  countWeakAreaTasks,
  buildTrackPool
};
